<?php

function lootus_theme_setup(): void {
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'custom-logo', array(
		'height'      => 64,
		'width'       => 64,
		'flex-height' => true,
		'flex-width'  => true,
	) );
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
	add_editor_style( 'style.css' );
}
add_action( 'after_setup_theme', 'lootus_theme_setup' );

function lootus_enqueue_styles(): void {
	$theme = wp_get_theme();
	$style_path = get_theme_file_path( 'style.css' );
	$version    = file_exists( $style_path ) ? (string) filemtime( $style_path ) : $theme->get( 'Version' );
	wp_enqueue_style( 'lootus-theme', get_stylesheet_uri(), array(), $version );
}
add_action( 'wp_enqueue_scripts', 'lootus_enqueue_styles' );

function lootus_enqueue_navigation_script(): void {
	$script_path = get_theme_file_path( 'assets/navigation.js' );
	wp_enqueue_script(
		'lootus-navigation',
		get_theme_file_uri( 'assets/navigation.js' ),
		array(),
		file_exists( $script_path ) ? (string) filemtime( $script_path ) : null,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'lootus_enqueue_navigation_script' );
