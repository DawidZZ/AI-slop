# Ziarno — makieta sklepu internetowego

Statyczna makieta sklepu (kawa, herbata, akcesoria) bez warstwy backendowej.
Czysty HTML + CSS + JavaScript, bez zależności i bez kroku budowania.

## Funkcje

- katalog produktów z filtrem kategorii, sortowaniem i wyszukiwarką
- strona produktu z wyborem ilości i produktami powiązanymi
- koszyk zapisywany w `localStorage` (zmiana ilości, usuwanie, próg darmowej dostawy)
- konto użytkownika: rejestracja, logowanie, profil z adresem, historia zamówień, usuwanie konta
  (dane w `localStorage`, hasła solone i hashowane SHA-256 — tylko na potrzeby makiety)
- formularz zamówienia z walidacją i stroną podziękowania (nic nie jest wysyłane)
- routing oparty na hashu (`#/produkt/...`) — działa na GitHub Pages bez przekierowań 404
- responsywny układ i tryb ciemny (wg ustawień systemu)

## Struktura

```
index.html           szkielet strony
css/style.css        style
js/products.js       dane produktów (tu edytujesz asortyment)
js/auth.js           konta użytkowników (localStorage)
js/app.js            logika: router, widoki, koszyk
.github/workflows/   automatyczny deploy na GitHub Pages
```

## Uruchomienie lokalne

Dowolny serwer statyczny, np.:

```bash
npx serve .
# lub
python -m http.server 8000
```

Można też po prostu otworzyć `index.html` w przeglądarce.

## Deploy na GitHub Pages

1. Utwórz repozytorium na GitHubie i wypchnij kod na gałąź `main`:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `Deploy to GitHub Pages` uruchomi się przy każdym pushu na `main`.
   Strona będzie dostępna pod `https://<user>.github.io/<repo>/`.

Wszystkie ścieżki w projekcie są względne, więc strona działa zarówno w podkatalogu repozytorium, jak i pod własną domeną.
