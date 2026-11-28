<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function lootus_wp_apply_site_configuration( $force = false ) {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return false;
	}

	$config_version = '5';
	if ( ! $force && $config_version === get_option( 'lootus_wp_config_version' ) ) {
		return true;
	}

	$changed = false;
	$options = array(
		'blogname'                    => 'Lootus',
		'WPLANG'                      => 'de_DE',
		'woocommerce_currency'        => 'EUR',
		'woocommerce_default_country' => 'DE',
		'woocommerce_coming_soon'     => 'no',
	);

	foreach ( $options as $name => $value ) {
		if ( $value !== get_option( $name ) ) {
			update_option( $name, $value );
			$changed = true;
		}
	}

	$permalinks                 = get_option( 'woocommerce_permalinks', array() );
	$permalinks                 = is_array( $permalinks ) ? $permalinks : array();
	$permalinks['product_base'] = 'produkt';
	$permalinks['tag_base']     = 'produkt-schlagwort';
	if ( $permalinks !== get_option( 'woocommerce_permalinks', array() ) ) {
		update_option( 'woocommerce_permalinks', $permalinks );
		$changed = true;
	}

	$pages = array(
		'woocommerce_cart_page_id'     => array(
			'slug'  => 'warenkorb',
			'title' => 'Warenkorb',
		),
		'woocommerce_checkout_page_id' => array(
			'slug'  => 'kasse',
			'title' => 'Kasse',
		),
	);

	$pages_ready = true;
	foreach ( $pages as $option => $page_config ) {
		$page = get_page_by_path( $page_config['slug'], OBJECT, 'page' );
		if ( ! $page ) {
			$current_id = (int) get_option( $option );
			$current    = $current_id ? get_post( $current_id ) : null;
			if ( $current instanceof WP_Post && 'page' === $current->post_type ) {
				$updated = wp_update_post(
					array(
						'ID'         => $current_id,
						'post_name'  => $page_config['slug'],
						'post_title' => $page_config['title'],
					),
					true
				);
				if ( is_wp_error( $updated ) ) {
					$pages_ready = false;
					continue;
				}
				$page    = get_post( $updated );
				$changed = true;
			}
		}

		if ( ! $page ) {
			$pages_ready = false;
			continue;
		}

		if ( $page_config['title'] !== $page->post_title ) {
			wp_update_post(
				array(
					'ID'         => $page->ID,
					'post_title' => $page_config['title'],
				)
			);
			$changed = true;
		}

		if ( (int) get_option( $option ) !== (int) $page->ID ) {
			update_option( $option, (int) $page->ID );
			$changed = true;
		}
	}

	$legal_pages_created = lootus_wp_ensure_shop_legal_pages();
	if ( false === $legal_pages_created ) {
		$pages_ready = false;
	} elseif ( $legal_pages_created > 0 ) {
		$changed = true;
	}

	if ( $changed ) {
		flush_rewrite_rules( false );
	}

	if ( ! $pages_ready ) {
		return false;
	}

	update_option( 'lootus_wp_config_version', $config_version );
	return true;
}

add_action( 'init', 'lootus_wp_apply_site_configuration', 99 );

function lootus_wp_ensure_shop_legal_pages() {
	$pages = array(
		'agb' => array(
			'title'    => 'Allgemeine Geschäftsbedingungen',
			'document' => 'agbPdf',
		),
		'widerrufsbelehrung' => array(
			'title'    => 'Widerrufsbelehrung',
			'document' => 'widerrufsbelehrungPdf',
		),
		'muster-widerrufsformular' => array(
			'title'    => 'Muster-Widerrufsformular',
			'document' => 'musterWiderrufsformularPdf',
		),
		'versand-zahlung' => array(
			'title'    => 'Versand- und Zahlungsbedingungen',
			'document' => 'versandZahlungPdf',
		),
		'datenschutzhinweise-shop' => array(
			'title'    => 'Datenschutzhinweise Shop',
			'document' => 'datenschutzShopPdf',
		),
	);

	$created = 0;
	foreach ( $pages as $slug => $page_config ) {
		if ( get_page_by_path( $slug, OBJECT, 'page' ) ) {
			continue;
		}

		$page_id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_name'    => $slug,
				'post_title'   => $page_config['title'],
				'post_content' => '<!-- wp:lootus/shop-legal-pdf {"document":"' . esc_attr( $page_config['document'] ) . '"} /-->',
			),
			true
		);
		if ( is_wp_error( $page_id ) ) {
			return false;
		}

		update_post_meta( $page_id, '_lootus_shop_legal_page', '1' );
		$created++;
	}

	return $created;
}

function lootus_wp_get_sanity_merge_content(): array {
	$cached = get_transient( 'lootus_wp_sanity_merge_content' );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$query = '*[_id == "mergePage"][0]{bannerTitle,"bannerImage":bannerImage.asset->url,"closingImage":closingImage.asset->url}';
	$url   = 'https://zgboj0ia.api.sanity.io/v2025-01-01/data/query/production?query=' . rawurlencode( $query );
	$data  = array(
		'bannerTitle' => 'Merch',
		'bannerImage' => '',
		'closingImage' => '',
	);

	$response = wp_remote_get(
		$url,
		array(
			'timeout' => 5,
			'headers' => array( 'Accept' => 'application/json' ),
		)
	);

	if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$result  = is_array( $payload ) && is_array( $payload['result'] ?? null ) ? $payload['result'] : array();
		$title   = sanitize_text_field( $result['bannerTitle'] ?? '' );
		$image   = esc_url_raw( $result['bannerImage'] ?? '' );
		$closing = esc_url_raw( $result['closingImage'] ?? '' );

		if ( '' !== $title ) {
			$data['bannerTitle'] = $title;
		}
		if ( 'cdn.sanity.io' === wp_parse_url( $image, PHP_URL_HOST ) ) {
			$data['bannerImage'] = $image;
		}
		if ( 'cdn.sanity.io' === wp_parse_url( $closing, PHP_URL_HOST ) ) {
			$data['closingImage'] = $closing;
		}
	}

	set_transient( 'lootus_wp_sanity_merge_content', $data, 15 * MINUTE_IN_SECONDS );
	return $data;
}

function lootus_wp_render_sanity_merge_title(): string {
	$content = lootus_wp_get_sanity_merge_content();
	return '<h1 class="wp-block-heading">' . esc_html( $content['bannerTitle'] ) . '</h1>';
}

function lootus_wp_render_sanity_merge_banner_image(): string {
	$content = lootus_wp_get_sanity_merge_content();
	if ( '' === $content['bannerImage'] ) {
		return '';
	}

	return '<img class="lootus-shop-hero__image" src="' . esc_url( $content['bannerImage'] ) . '" alt="" fetchpriority="high" />';
}

function lootus_wp_render_sanity_merge_closing_image(): string {
	$content = lootus_wp_get_sanity_merge_content();
	if ( '' === $content['closingImage'] ) {
		return '';
	}

	return '<figure class="wp-block-image size-full lootus-merch-closing"><img src="' . esc_url( $content['closingImage'] ) . '" alt="" loading="lazy" /></figure>';
}

function lootus_wp_register_sanity_merge_blocks(): void {
	register_block_type( 'lootus/sanity-merge-title', array( 'render_callback' => 'lootus_wp_render_sanity_merge_title' ) );
	register_block_type( 'lootus/sanity-merge-banner-image', array( 'render_callback' => 'lootus_wp_render_sanity_merge_banner_image' ) );
	register_block_type( 'lootus/sanity-merge-closing-image', array( 'render_callback' => 'lootus_wp_render_sanity_merge_closing_image' ) );
}
add_action( 'init', 'lootus_wp_register_sanity_merge_blocks', 5 );

function lootus_wp_get_sanity_site_settings(): array {
	$cached = get_transient( 'lootus_wp_sanity_site_settings' );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$query = '*[_id == "siteSettings"][0]{footerTagline}';
	$url   = 'https://zgboj0ia.api.sanity.io/v2025-01-01/data/query/production?query=' . rawurlencode( $query );
	$tagline = 'Konstanz';
	$response = wp_remote_get(
		$url,
		array(
			'timeout' => 5,
			'headers' => array( 'Accept' => 'application/json' ),
		)
	);

	if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$result  = is_array( $payload ) && is_array( $payload['result'] ?? null ) ? $payload['result'] : array();
		$value   = sanitize_text_field( $result['footerTagline'] ?? '' );
		if ( '' !== $value ) {
			$tagline = $value;
		}
	}

	$data = array( 'footerTagline' => $tagline );
	set_transient( 'lootus_wp_sanity_site_settings', $data, 15 * MINUTE_IN_SECONDS );
	return $data;
}

function lootus_wp_get_sanity_shop_legal_documents(): array {
	$cached = get_transient( 'lootus_wp_sanity_shop_legal_documents' );
	if ( is_array( $cached ) ) {
		return $cached;
	}

	$query = '*[_id == "shopLegalDocuments"][0]{"agbPdf":agbPdf.asset->url,"widerrufsbelehrungPdf":widerrufsbelehrungPdf.asset->url,"musterWiderrufsformularPdf":musterWiderrufsformularPdf.asset->url,"versandZahlungPdf":versandZahlungPdf.asset->url,"datenschutzShopPdf":datenschutzShopPdf.asset->url}';
	$url   = 'https://zgboj0ia.api.sanity.io/v2025-01-01/data/query/production?query=' . rawurlencode( $query );
	$data  = array_fill_keys(
		array( 'agbPdf', 'widerrufsbelehrungPdf', 'musterWiderrufsformularPdf', 'versandZahlungPdf', 'datenschutzShopPdf' ),
		''
	);

	$response = wp_remote_get(
		$url,
		array(
			'timeout' => 5,
			'headers' => array( 'Accept' => 'application/json' ),
		)
	);

	if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$result  = is_array( $payload ) && is_array( $payload['result'] ?? null ) ? $payload['result'] : array();
		foreach ( $data as $key => $unused ) {
			$file_url = esc_url_raw( $result[ $key ] ?? '' );
			if ( 'cdn.sanity.io' === wp_parse_url( $file_url, PHP_URL_HOST ) ) {
				$data[ $key ] = $file_url;
			}
		}
	}

	set_transient( 'lootus_wp_sanity_shop_legal_documents', $data, 15 * MINUTE_IN_SECONDS );
	return $data;
}

function lootus_wp_render_shop_legal_pdf( array $attributes ): string {
	$documents = array(
		'agbPdf'                    => 'Allgemeine Geschäftsbedingungen',
		'widerrufsbelehrungPdf'     => 'Widerrufsbelehrung',
		'musterWiderrufsformularPdf' => 'Muster-Widerrufsformular',
		'versandZahlungPdf'         => 'Versand- und Zahlungsbedingungen',
		'datenschutzShopPdf'        => 'Datenschutzhinweise Shop',
	);
	$key = sanitize_text_field( $attributes['document'] ?? '' );
	if ( ! isset( $documents[ $key ] ) ) {
		return '';
	}

	$data = lootus_wp_get_sanity_shop_legal_documents();
	$url  = $data[ $key ] ?? '';
	if ( '' === $url ) {
		return '<p class="lootus-shop-legal-pdf lootus-shop-legal-pdf--pending">Das geprüfte PDF-Dokument wird hier bereitgestellt, sobald es vorliegt.</p>';
	}

	$title = $documents[ $key ];
	return '<p class="lootus-shop-legal-pdf"><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $title ) . ' (PDF öffnen)</a></p>';
}

function lootus_wp_register_shop_legal_block(): void {
	register_block_type(
		'lootus/shop-legal-pdf',
		array(
			'attributes'      => array( 'document' => array( 'type' => 'string' ) ),
			'render_callback' => 'lootus_wp_render_shop_legal_pdf',
		)
	);
}
add_action( 'init', 'lootus_wp_register_shop_legal_block', 5 );

function lootus_wp_render_footer_copyright(): string {
	$year = (int) current_time( 'Y' );
	$text = '© ' . $year . ' Lootus';
	if ( $year > 2026 ) {
		$text .= ', seit 2026';
	}

	return '<span class="lootus-footer__meta">' . esc_html( $text ) . '</span>';
}

function lootus_wp_render_footer_tagline(): string {
	$settings = lootus_wp_get_sanity_site_settings();
	return '<span class="lootus-footer__meta">' . esc_html( $settings['footerTagline'] ) . '</span>';
}

function lootus_wp_register_footer_blocks(): void {
	register_block_type( 'lootus/footer-copyright', array( 'render_callback' => 'lootus_wp_render_footer_copyright' ) );
	register_block_type( 'lootus/footer-tagline', array( 'render_callback' => 'lootus_wp_render_footer_tagline' ) );
}
add_action( 'init', 'lootus_wp_register_footer_blocks', 5 );

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'lootus-config apply',
		static function (): void {
			if ( ! lootus_wp_apply_site_configuration( true ) ) {
				WP_CLI::error( 'WooCommerce-Seiten fehlen; WordPress-Konfiguration wurde nicht als angewendet markiert.' );
			}
			WP_CLI::success( 'Versionierte Lootus-WordPress-Konfiguration angewendet.' );
		}
	);
}