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
	wp_enqueue_style( 'lootus-theme', get_stylesheet_uri(), array(), $theme->get( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'lootus_enqueue_styles' );
