<?php
/**
 * Plugin Name: Lootus Local Shop Fixtures
 * Description: Local-only WooCommerce demo products and Stripe test-mode setup.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function lootus_local_shop_is_local(): bool {
	return function_exists( 'wp_get_environment_type' ) && 'local' === wp_get_environment_type();
}

function lootus_local_shop_get_or_create_attribute( string $slug, string $label, array $values ): array {
	$attribute_id = wc_attribute_taxonomy_id_by_name( $slug );
	if ( ! $attribute_id ) {
		$attribute_id = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);
		if ( is_wp_error( $attribute_id ) ) {
			throw new RuntimeException( $attribute_id->get_error_message() );
		}
	} elseif ( function_exists( 'wc_update_attribute' ) ) {
		$updated = wc_update_attribute(
			$attribute_id,
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);
		if ( is_wp_error( $updated ) ) {
			throw new RuntimeException( $updated->get_error_message() );
		}
	}

	$taxonomy = wc_attribute_taxonomy_name( $slug );
	if ( ! taxonomy_exists( $taxonomy ) ) {
		register_taxonomy(
			$taxonomy,
			array( 'product' ),
			array(
				'hierarchical' => false,
				'public'       => false,
				'show_ui'      => false,
				'query_var'    => true,
				'rewrite'      => false,
			)
		);
	}

	$term_ids = array();
	$term_map = array();
	foreach ( $values as $slug => $value ) {
		$name      = sanitize_text_field( $value );
		$term_slug = sanitize_title( $slug );
		$term      = term_exists( $term_slug, $taxonomy );
		if ( ! $term ) {
			$term = wp_insert_term( $name, $taxonomy, array( 'slug' => $term_slug ) );
		}
		if ( is_wp_error( $term ) ) {
			throw new RuntimeException( $term->get_error_message() );
		}

		$term_id = (int) ( is_array( $term ) ? $term['term_id'] : $term );
		$current = get_term( $term_id, $taxonomy );
		if ( $current && ! is_wp_error( $current ) && $name !== $current->name ) {
			$updated = wp_update_term( $term_id, $taxonomy, array( 'name' => $name ) );
			if ( is_wp_error( $updated ) ) {
				throw new RuntimeException( $updated->get_error_message() );
			}
		}
		$term_ids[]       = $term_id;
		$term_map[ $name ] = $term_slug;
	}

	$attribute = new WC_Product_Attribute();
	$attribute->set_id( (int) $attribute_id );
	$attribute->set_name( $taxonomy );
	$attribute->set_options( $term_ids );
	$attribute->set_visible( true );
	$attribute->set_variation( true );

	return array(
		'attribute' => $attribute,
		'taxonomy'  => $taxonomy,
		'terms'     => $term_map,
	);
}

function lootus_local_shop_find_product( string $fixture_key ): int {
	$ids = get_posts(
		array(
			'post_type'      => 'product',
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_lootus_local_fixture',
			'meta_value'     => $fixture_key,
		)
	);

	return $ids ? (int) $ids[0] : 0;
}

function lootus_local_shop_find_variation( string $fixture_key ): int {
	$ids = get_posts(
		array(
			'post_type'      => 'product_variation',
			'post_status'    => array( 'publish', 'private' ),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_lootus_local_fixture',
			'meta_value'     => $fixture_key,
		)
	);

	return $ids ? (int) $ids[0] : 0;
}

function lootus_local_shop_image_id( int $product_id ): int {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_lootus_local_fixture',
			'meta_value'     => 'demo-shirt-image',
		)
	);

	$image_path = plugin_dir_path( __FILE__ ) . 'assets/demo-shirt.svg';
	$uploads    = wp_upload_dir();
	if ( ! empty( $uploads['error'] ) ) {
		throw new RuntimeException( $uploads['error'] );
	}
	wp_mkdir_p( $uploads['path'] );
	$upload_path = trailingslashit( $uploads['path'] ) . 'local-demo-shirt.svg';
	if ( ! file_exists( $upload_path ) && ! copy( $image_path, $upload_path ) ) {
		throw new RuntimeException( 'Demo-Produktbild konnte nicht in den Upload-Ordner kopiert werden.' );
	}

	if ( $existing ) {
		$image_id = (int) $existing[0];
		update_attached_file( $image_id, $upload_path );
		return $image_id;
	}

	$image_id = wp_insert_attachment(
		array(
			'post_title'     => 'Local demo shirt',
			'post_status'    => 'inherit',
			'post_mime_type' => 'image/svg+xml',
		),
		$upload_path,
		$product_id,
		true
	);
	if ( is_wp_error( $image_id ) ) {
		throw new RuntimeException( $image_id->get_error_message() );
	}

	update_attached_file( $image_id, $upload_path );
	update_post_meta( $image_id, '_lootus_local_fixture', 'demo-shirt-image' );
	update_post_meta( $image_id, '_wp_attachment_image_alt', 'Demo-Shirt, nur lokale Testdaten' );

	return (int) $image_id;
}

function lootus_local_shop_seed(): void {
	if ( ! lootus_local_shop_is_local() ) {
		WP_CLI::error( 'Lokale Demo-Produkte duerfen nur in einer lokalen WordPress-Umgebung angelegt werden.' );
	}
	if ( ! class_exists( 'WooCommerce' ) ) {
		WP_CLI::error( 'WooCommerce ist nicht aktiv.' );
	}

	$color_data = lootus_local_shop_get_or_create_attribute( 'color', 'Farbe', array( 'demo-black' => 'Demo Schwarz', 'demo-white' => 'Demo Weiß' ) );
	$size_data  = lootus_local_shop_get_or_create_attribute( 'size', 'Größe', array( 's' => 'S', 'm' => 'M', 'l' => 'L' ) );
	$product_id = lootus_local_shop_find_product( 'local-demo-shirt' );
	$product    = new WC_Product_Variable( $product_id );
	$product->set_name( 'DEMO LOKAL – Variables T-Shirt' );
	$product->set_slug( 'local-demo-variable-tshirt' );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$product->set_description( 'Lokales Demo-Produkt zum Testen von WooCommerce-Varianten und Stripe-Testmodus. Keine echten Produktdaten, keine Produktion und kein PDpartner-Fulfillment.' );
	$product->set_short_description( 'DEMO LOKAL – Farbe und Größe auswählen.' );
	$product->set_menu_order( 0 );
	$product->set_stock_status( 'instock' );
	$product->set_attributes( array( $color_data['attribute'], $size_data['attribute'] ) );
	$product->update_meta_data( '_lootus_local_fixture', 'local-demo-shirt' );
	$product_id = $product->save();

	$demo_category = term_exists( 'demo', 'product_cat' );
	if ( ! $demo_category ) {
		$demo_category = wp_insert_term( 'Demo', 'product_cat', array( 'slug' => 'demo' ) );
	}
	if ( is_wp_error( $demo_category ) ) {
		throw new RuntimeException( $demo_category->get_error_message() );
	}
	$demo_category_id = (int) ( is_array( $demo_category ) ? $demo_category['term_id'] : $demo_category );
	wp_set_object_terms( $product_id, array( $demo_category_id ), 'product_cat', false );

	$image_id = lootus_local_shop_image_id( $product_id );
	$product  = wc_get_product( $product_id );
	$product->set_image_id( $image_id );
	$product->save();

	foreach ( $color_data['terms'] as $color_name => $color_slug ) {
		foreach ( $size_data['terms'] as $size_name => $size_slug ) {
			$fixture_key = 'local-demo-shirt-' . $color_slug . '-' . $size_slug;
			$variation   = new WC_Product_Variation( lootus_local_shop_find_variation( $fixture_key ) );
			$variation->set_parent_id( $product_id );
			$variation->set_status( 'publish' );
			$variation->set_attributes(
				array(
					$color_data['taxonomy'] => $color_slug,
					$size_data['taxonomy']  => $size_slug,
				)
			);
			$variation->set_regular_price( '24.90' );
			$variation->set_manage_stock( false );
			$variation->set_stock_status( 'instock' );
			$variation->update_meta_data( '_lootus_local_fixture', $fixture_key );
			$variation->save();
		}
	}

	WC_Product_Variable::sync( $product_id );
	wc_delete_product_transients( $product_id );

	$stripe_settings                = get_option( 'woocommerce_stripe_settings', array() );
	$stripe_settings                = is_array( $stripe_settings ) ? $stripe_settings : array();
	$stripe_settings['enabled']     = 'yes';
	$stripe_settings['testmode']    = 'yes';
	update_option( 'woocommerce_stripe_settings', $stripe_settings );

	WP_CLI::success( 'Lokales Demo-Shirt (6 Varianten) angelegt; WooCommerce Stripe ist auf Testmodus gesetzt. Stripe-Testschluessel muessen im Admin hinterlegt werden.' );
}

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'lootus-local seed', 'lootus_local_shop_seed' );
}