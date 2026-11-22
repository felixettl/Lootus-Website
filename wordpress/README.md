# WordPress

Diese Struktur enthält ein natives Block Theme (`themes/lootus`) für Full Site Editing sowie das optionale, zunächst funktionslose Plugin `plugins/lootus-core`. WordPress-Core und WooCommerce bleiben außerhalb dieses Repositories; WooCommerce kann seine regulären Shop-Funktionen und Templates verwenden.

Die Shop-, Produkt-, Warenkorb- und Kassenansichten verwenden WooCommerce-Blöcke. Produkte, Bilder, Preise, Bestand und Größen-/Farbvarianten werden in WooCommerce gepflegt; Warenkorb und Checkout nutzen dessen reguläre Abläufe.

## Theme installieren

1. ZIP-Datei mit dem Theme-Ordner `lootus` und dessen Inhalt erstellen.
2. In der WordPress-Administration **Design → Themes → Theme hinzufügen → Theme hochladen** öffnen und die ZIP-Datei auswählen.
3. Das Theme nach dem Upload aktivieren.

Das Plugin kann bei Bedarf separat als ZIP aus `plugins/lootus-core` gepackt und unter **Plugins → Installieren → Plugin hochladen** installiert werden.
