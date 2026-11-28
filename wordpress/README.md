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

Der Shop laeuft unter `http://localhost:8888`. WooCommerce und WordPress sind auf dieselben Versionen wie der Live-Shop gepinnt; das Theme `lootus` wird aktiviert und die versionierte WordPress-Konfiguration angewendet. Die lokale Administration ist unter `http://localhost:8888/wp-admin` erreichbar (Benutzer `admin`, Passwort `password`). Zum Beenden `npm run stop` ausfuehren.

## Konfiguration als Code

`mu-plugins/lootus-wp-config.php` ist die gemeinsame WordPress-Konfiguration fuer lokale Entwicklung und Deployment. Sie setzt Waehrung, Basisland, Produkt-Permalink und die Warenkorb-/Kassenseiten auf die im Live-Shop verwendeten Werte. Die Migration ist versioniert; nach einer Konfigurationsaenderung muss ihre Versionsnummer erhoeht werden. Lokal laeuft sie beim Start und kann mit `npm run config:apply` erneut angewendet werden. Der WordPress-Deploy-Workflow liefert die MU-Plugin-Datei neben dem Theme aus; WordPress wendet eine neue Konfigurationsversion beim naechsten Request an.

Produktbestand, Zahlungsanbieter und PDpartner-Zugangsdaten werden nicht in dieser Konfiguration gespeichert. Zugangsdaten gehoeren in getrennte Sandbox-/Produktionsumgebungen und duerfen nicht ins Repository.

### Shop-Rechtsdokumente

Im Sanity Studio liegt unter **Shop > Rechtliche PDFs** ein Singleton fuer finale PDFs zu AGB, Widerrufsbelehrung, Muster-Widerrufsformular, Versand/Zahlung und shopbezogenen Datenschutzhinweisen. Die WordPress-Seiten `/agb`, `/widerrufsbelehrung`, `/muster-widerrufsformular`, `/versand-zahlung` und `/datenschutzhinweise-shop` werden durch die versionierte Konfiguration vorbereitet und zeigen einen Downloadlink, sobald die jeweilige PDF in Sanity hinterlegt ist. Bis dahin steht dort nur ein Hinweis; Rechtstexte werden nicht automatisch erzeugt.

### Lokale Demo-Produkte und Stripe

Die lokale wp-env-Umgebung installiert zusaetzlich ein nur dort eingebundenes Demo-Shop-Plugin mit einem markierten variablen Test-Shirt. Es ist nicht Teil des WordPress-Deployments und wird auf Produktion nicht geladen. PDpartner bleibt lokal bewusst unverbunden.

Das offizielle WooCommerce-Stripe-Plugin ist lokal im Testmodus aktiviert. Fuer echte Stripe-Testzahlungen in **WooCommerce > Einstellungen > Zahlungen > Stripe** die Stripe-Test-Publishable-Key- und Secret-Key-Werte eintragen. Diese Testschluessel sind im Stripe-Dashboard verfuegbar; keine Live-Schluessel verwenden. Das Checkout-Frontend laeuft lokal, die Testautorisierung kommuniziert weiterhin mit Stripes Test-API und ist daher nicht offline. Ohne Testschluessel kann der Checkout angezeigt, aber keine Stripe-Zahlung autorisiert werden.

Die Merch-Bannerueberschrift sowie Banner- und Abschlussbild werden serverseitig aus dem oeffentlichen Sanity-Dokument geladen und 15 Minuten lokal zwischengespeichert. Produktdaten aus Sanity werden nicht verwendet.
