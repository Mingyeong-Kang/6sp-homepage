# Ewha SafeMeal

Ewha SafeMeal is a static website that helps Ewha Womans University students check allergen information for campus meals. Students can select from 19 allergen categories to see how each dish matches their preferences.

Developed by **Team 6sp** for the **Open Software Platform** course.

> The MVP is in development. The menu page uses sample menus and test allergen results for the New Engineering Building cafeteria. Do not use this preview to make meal decisions.

## Implementation status

| Feature | Status | Details |
| --- | --- | --- |
| Shared responsive UI | Implemented | Desktop header and footer, mobile navigation, cards, badges, and dialogs |
| Allergen preferences | Implemented | Select, clear, and save preferences in the current browser. Saved choices appear in the header and update the menu badges. |
| Cafeteria and date selection | Partially implemented | Browse sample lunches, move between weeks, and see empty states for dates without data or for Jinseonmi-gwan. |
| Personalized allergen badges | Partially implemented | The menu page compares saved preferences with test data. Integration with the JSON datasets is pending. |
| Allergen lookup and data generation | Implemented | Lookup module, dietitian spreadsheet import, and MFDS recipe data generation |
| Automated recipe updates | Implemented | GitHub Actions is scheduled to run every Monday at 03:00 KST and opens or updates a pull request when recipe data changes. |
| Menu search and details | In progress | The search page provides the shared layout. |
| Data guide | In progress | The guide page provides the shared layout. |

Preferences are stored without an account as an array of allergen IDs under `safemeal.allergenIds` in browser local storage.

## Allergen data

The lookup module prioritizes the New Engineering Building cafeteria dietitian's allergen table, then looks for matching or similar recipes from the Ministry of Food and Drug Safety (MFDS). It can fall back to keyword hints from dish names. The module returns the source and confidence of the result. The menu page currently uses its own sample data.

| File | Purpose |
| --- | --- |
| `data/dietitian-allergens.json` | Allergen records converted from the cafeteria dietitian's spreadsheets |
| `data/recipe-allergens.json` | Full MFDS recipe dataset with ingredient and allergen details |
| `data/recipe-allergens.min.json` | Compact recipe dataset for browser lookup |
| `data/allergen_rules.json` | Keyword and exclusion rules for allergen detection |
| `js/lookup.js` | Dish-name normalization, source matching, and comparison with saved preferences |

### Status labels

| Label | Meaning |
| --- | --- |
| Contains | The result lists an allergen that matches a saved preference. Check the source to see whether the result is an estimate. |
| May contain | The available information suggests a possible match. |
| Insufficient information | The available information is missing or too uncertain to determine a match. |
| No known match | The available information shows no match. This label does not establish that the dish is safe. |

Dietitian records cover primary ingredients and may omit components of processed foods, sauces, or seasonings. Standard recipes and dish-name estimates can differ from what a cafeteria serves. Confirm ingredients and possible cross-contact with cafeteria staff or the dietitian before relying on allergen information.

## Run locally

From the repository root, start a static file server:

```sh
python -m http.server 8000
```

Open `http://localhost:8000` for the menu or `http://localhost:8000/components.html` for the component preview. VS Code Live Server also works. The site requires no frontend build step. Use a local server when working with JSON requests, since browsers may block them when opening HTML files directly.

## Update the datasets

### MFDS recipe data

Copy `.env.example` to `.env`, set `FOODSAFETY_API_KEY`, and run:

```sh
python scripts/build_recipes.py
```

The script preserves the existing output if the response is incomplete or the recipe count falls by more than 10%. The scheduled workflow uses the repository's `FOODSAFETY_API_KEY` Actions secret and submits changed data through the `bot/update-recipes` branch.

### Dietitian data

Place the approved spreadsheet in `data/source/` and list it first in `SOURCE_FILES` in `scripts/build_dietitian.py`. Confirm permission before publishing source spreadsheets.

```sh
python -m pip install openpyxl
python scripts/build_dietitian.py
```

See the [data guide](docs/data.md) for details on dataset generation and lookup rules.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Menu page and allergen preferences |
| `search.html` | Menu search and details page scaffold |
| `guide.html` | Data guide page scaffold |
| `components.html` | Shared component preview |
| `css/` | Design tokens, shared styles, and page-specific styles |
| `js/` | Shared UI, allergen lookup, and page scripts |
| `data/` | Source spreadsheets and generated datasets |
| `scripts/` | Python data generation scripts |
| `docs/` | Component and data documentation |
| `.github/workflows/` | Scheduled recipe update workflow |

See the [shared component guide](docs/components.md) for UI conventions.

## Technology and dependencies

The frontend uses HTML, CSS, JavaScript, JSON, and browser local storage. Python generates the datasets, and GitHub Actions handles scheduled recipe updates. GitHub Pages deployment is planned.

| Dependency | Purpose | License |
| --- | --- | --- |
| [Day.js](https://day.js.org/) 1.11.13 | Date and week calculations, with Korean locale support | MIT |
| [Lucide](https://lucide.dev/) | SVG interface icons | ISC |
| [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR) | Web font served through Google Fonts | SIL Open Font License 1.1 |
| [openpyxl](https://openpyxl.readthedocs.io/) | Reading dietitian spreadsheets | MIT |

## Team

| Member | Responsibilities |
| --- | --- |
| Mingyeong Kang | Figma design, shared UI components, and responsive styling |
| Seojin Park | Allergen preferences and local storage |
| Soobin Lee | Menu page, status badges, and empty states |
| Eunseo Jang | Menu details, search, and MFDS API research |
| Chaeeun Lee | JSON datasets, source information, and verification metadata |
| Jeonghyeon Park | GitHub integration, QA coordination, documentation, and presentation preparation |

## Contributing

Start from the latest `main` on your assigned branch. Open a pull request targeting `main` and use the PR template to describe your changes, affected files, and verification steps. Coordinate shared-file changes with the responsible teammate and complete the required reviews before merging.

## Next steps

- Replace the sample cafeteria menus with weekly menu data and connect `js/lookup.js` to the menu page.
- Implement menu search, dish details, and the data guide.
- Test the integrated site and deploy to GitHub Pages.

## References

- [Ewha Womans University campus dining information](https://www.ewha.ac.kr/ewha/life/restaurant.do)
- [MFDS food labeling standards](https://www.mfds.go.kr/brd/m_207/view.do?seq=14028)
- [Public Data Portal recipe API](https://www.data.go.kr/data/15127578/openapi.do)
- Allergen tables supplied by the New Engineering Building cafeteria dietitian
