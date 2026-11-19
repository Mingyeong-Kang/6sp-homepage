# Ewha SafeMeal

A campus dining information website that helps Ewha Womans University students explore meals based on their allergen preferences and dietary needs.

Developed by **Team 6sp** for the **Open Software Platform** course.

> Project status: Under development. Features described below represent the planned MVP unless otherwise stated.

## Overview

Campus menus are available online, but detailed ingredient and allergen information can require additional inquiries.

During our initial research, obtaining allergen information involved reviewing the university website, making a phone inquiry, visiting cafeteria nutritionists, and receiving files by email.

Ewha SafeMeal aims to bring available meal information, sources, and verification status together in one place.

### Target Users

- Primary: Ewha students with food allergies or dietary restrictions.
- Secondary: Students interested in additional dietary preferences or available nutritional information.

## Planned MVP Features

- Browse meal records by cafeteria and date.
- Select, save, and clear personal allergen preferences.
- Display available allergen information and its verification status.
- Highlight allergens matching the user's saved preferences.
- Clearly identify missing, estimated, or unverified information.
- View meal details, information sources, and relevant dates.
- Search meals and filter results based on available allergen information.

Preferences are planned to be stored in the current browser without requiring an account.

### Additional Features Under Consideration

- Additional dietary preferences.
- Comparison of available calorie and protein information.
- MFDS API integration.
- Support for additional cafeterias.

These features depend on data availability and development time.

## User Flow

1. Select allergen preferences, if needed.
2. Choose a cafeteria and date.
3. Browse meals and review their status labels.
4. Search or apply filters.
5. Open a meal to review available information and sources.
6. Confirm uncertain information with cafeteria staff when necessary.

When no menu data is available, users will be guided to select another date or search by dish name.

## Data Sources and Reliability

### Collected Cafeteria Materials

Our initial research collected materials directly from nutritionists at:

| Cafeteria | Collected Materials |
| --- | --- |
| Jinseonmi-gwan | Ingredient lists and cooking plans |
| New Engineering Building | Representative and dated allergen tables, including product-check notes |

Team-prepared classifications will be distinguished from information supplied by cafeteria nutritionists.

### General Reference Data

Following proposal feedback, the team is investigating MFDS food databases and general recipe references as supplementary sources.

A general recipe may differ from the recipe used by a cafeteria. Any information derived from these references must therefore be labeled as an estimate rather than cafeteria-confirmed information.

MFDS API integration is under investigation and is not yet confirmed as an implemented feature.

### Information Labels

The interface is planned to distinguish:

- Information provided by cafeteria nutritionists.
- Team-derived classifications awaiting review.
- Estimates based on general recipe references.
- Missing or insufficient information.

Source details and relevant dates will be displayed when available.

Warning colors will be accompanied by text labels so that meaning does not depend on color alone.

### Limitations

- Missing allergen information does not mean that a meal is allergen-free.
- General recipe estimates do not confirm the ingredients of a specific cafeteria meal.
- The service does not guarantee that a meal is safe for an individual user.
- Halal, vegan, or other dietary suitability will not be confirmed without sufficient evidence.
- Users should contact cafeteria staff or nutritionists for confirmation when information is uncertain.
- Real-time menu updates are outside the initial implementation plan.

The first demonstration will focus on one cafeteria. The demonstration location and data update responsibilities will be finalized by the team.

## Technical Plan

| Technology | Planned Use |
| --- | --- |
| HTML | Page structure |
| CSS | Shared styling and responsive layouts |
| JavaScript | User interactions, filtering, and data rendering |
| JSON | Structured meal records and source metadata |
| Browser local storage | Saved allergen preferences |
| Git and GitHub | Version control and collaboration |
| GitHub Pages | Planned static website deployment |

The initial version is planned as a static website without a dedicated backend server.

### Data Workflow

1. Collect cafeteria materials and relevant reference data.
2. Record sources, dates, and verification status.
3. Review and organize records into JSON.
4. Display records with appropriate labels and warnings.
5. Update records as new information becomes available.

## Accessibility and Quality Goals

- Support mobile and desktop layouts.
- Provide clear navigation and readable text.
- Support keyboard interaction.
- Use text labels alongside status colors.
- Keep information sources and uncertainty visible.
- Handle missing menu data and unverified allergen information clearly.

## Team and Responsibilities

| Member | Responsibility |
| --- | --- |
| Mingyeong Kang | Figma design, shared UI components, and responsive styling |
| Seojin Park | Allergen settings, preference interactions, and local storage |
| Soobin Lee | Cafeteria menu display, status badges, and unavailable-data states |
| Eunseo Jang | Meal details, search functionality, and MFDS API investigation |
| Chaeeun Lee | JSON data organization, source information, and verification metadata |
| Jeonghyeon Park | GitHub integration, QA coordination, documentation, and presentation preparation |

## Collaboration Workflow

1. Start from the latest `main`.
2. Work in the assigned feature or documentation branch.
3. Commit related changes with a clear message.
4. Open a pull request targeting `main`.
5. Describe the changes, testing performed, and remaining work.
6. Complete the reviews required by the repository rules.
7. Merge after review and integration checks.

### Working Branches

| Branch | Purpose |
| --- | --- |
| `main` | Integrated project code |
| `feat/ui` | Shared UI and responsive styling |
| `feat/allergy` | Allergen settings and saved preferences |
| `feat/menu` | Menu listing and status display |
| `feat/detail-search` | Meal details and search |
| `feat/data` | Meal data and source information |
| `docs/guide` | Documentation and collaboration guidance |

Coordinate with the relevant team members before modifying shared files.

## Development Schedule

| Period | Planned Milestone |
| --- | --- |
| November 12–18, 2026 | Initial implementation of assigned screens and collaboration setup |
| November 19–25, 2026 | Complete and integrate must-have MVP features |
| November 26, 2026 | Complete critical fixes and deploy the stable MVP |
| November 27–December 3, 2026 | Feature freeze and exam preparation |
| December 4–9, 2026 | Prepare the presentation, demonstration, script, and Q&A |
| December 10, 2026 | Final presentation |

## Testing Plan

Testing will cover:

- Cafeteria and date selection.
- Menu rendering and meal detail navigation.
- Saving, restoring, and clearing allergen preferences.
- Allergen matching and filter behavior.
- Missing menu data.
- Missing, estimated, and unverified allergen information.
- Source and date consistency.
- Responsive layouts and keyboard navigation.

Each contributor will test their own changes before opening a pull request. Integration testing will be coordinated before deployment.

## Open-Source Usage

Open-source libraries will be selected based on their relevance to the project.

For each adopted library, this documentation will record:

- Project name and source link.
- Purpose and integration location.
- Version used.
- License and required attribution.

No specific third-party library is confirmed in this initial README.

## Running the Project

Setup and execution instructions will be added once the initial implementation and directory structure are finalized.

## References

- Ewha campus dining information:
  https://www.ewha.ac.kr/ewha/life/restaurant.do
- MFDS Food Labeling Standards:
  https://www.mfds.go.kr/brd/m_207/view.do?seq=14028
- Public Data Portal API reference:
  https://www.data.go.kr/data/15127578/openapi.do
- Cafeteria materials supplied directly by nutritionists.

Reference sources do not necessarily represent completed integrations.
