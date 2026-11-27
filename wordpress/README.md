# WordPress

Diese Struktur enthält ein natives Block Theme (`themes/lootus`) für Full Site Editing sowie das optionale, zunächst funktionslose Plugin `plugins/lootus-core`. WordPress-Core und WooCommerce bleiben außerhalb dieses Repositories; WooCommerce kann seine regulären Shop-Funktionen und Templates verwenden.

Die Shop-, Produkt-, Warenkorb- und Kassenansichten verwenden WooCommerce-Blöcke. Produkte, Bilder, Preise, Bestand und Größen-/Farbvarianten werden in WooCommerce gepflegt; Warenkorb und Checkout nutzen dessen reguläre Abläufe.

## Theme installieren

1. ZIP-Datei mit dem Theme-Ordner `lootus` und dessen Inhalt erstellen.
2. In der WordPress-Administration **Design → Themes → Theme hinzufügen → Theme hochladen** öffnen und die ZIP-Datei auswählen.
3. Das Theme nach dem Upload aktivieren.

Das Plugin kann bei Bedarf separat als ZIP aus `plugins/lootus-core` gepackt und unter **Plugins → Installieren → Plugin hochladen** installiert werden.

## Lokaler Shop-Server

Voraussetzung ist Docker Desktop. Im Ordner `wordpress` die Abhaengigkeiten installieren und den Server starten:

```sh
npm install
npm run dev
```

Der Shop laeuft unter `http://localhost:8888`. WooCommerce wird dabei installiert, das Theme `lootus` aktiviert. Die lokale WordPress-Administration ist unter `http://localhost:8888/wp-admin` erreichbar (Benutzer `admin`, Passwort `password`). Zum Beenden `npm run stop` ausfuehren.
