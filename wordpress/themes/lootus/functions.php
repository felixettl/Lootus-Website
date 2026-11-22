<?php

function lootus_theme_setup(): void {
	add_theme_support( 'wp-block-styles' );
}
add_action( 'after_setup_theme', 'lootus_theme_setup' );
