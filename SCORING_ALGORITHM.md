# Scoring Algorithm

Local interface for cosmetic product scoring. No organic/synthetic classification is used.

## Risk levels (per ingredient)

Each ingredient is classified into one of four risk levels based on current science (health and environment):

| Level    | Dot   | Description |
|----------|--------|-------------|
| Risk-free | Green  | No known concerns |
| Low risk  | Yellow | Minor concerns (e.g. mild allergen, mild irritant) |
| Moderate risk | Orange | Notable concerns (e.g. endocrine disruption, carcinogenic, allergenic, irritant, pollutant) |
| High-risk | Red    | Hazardous (e.g. confirmed endocrine disruptor, carcinogen, severe allergen) |

Risks considered: **endocrine disruption**, **carcinogenic**, **allergenic**, **irritant**, **pollutant**.  
Details and scientific sources for each ingredient can be shown in the app.

## Score (0–100)

The **overall score is driven by the highest-risk ingredient** in the product:

- **If any high-risk (red) ingredient is present**  
  → Score is **red**: **&lt; 25/100** (range 0–24).

- **If the highest risk is moderate (orange)**  
  → Score is **orange**: **&lt; 50/100** (range 0–49).

- **If the highest risk is low (yellow) or risk-free (green)**  
  → Score can be in the **green band**: **50–100**.

Within each range, **other ingredients** (and their risk levels) determine the **exact** score via penalties (e.g. more yellow/orange/red ingredients lower the score within the allowed band).

## API / types (local contract)

- **Input**: Product name, product type, list of ingredients (INCI).
- **Output**:
  - `score`: number 0–100 (integer).
  - `positive_ingredients` / `negative_ingredients`: arrays of `{ category, items: [{ name, benefit?, concern?, risk_level?: 'green'|'yellow'|'orange'|'red' }] }`.
  - `verdict`: string.
  - `healthier_alternative`: optional (e.g. when score &lt; 50).
- **Removed**: No `organic` / `synthetic` / organic type in the response; DB may still store a fixed value (e.g. `organicType: 'N/A'`) for compatibility.

## Score bands (UI)

| Score   | Band    | Label (example) |
|---------|---------|------------------|
| 0–24    | Red     | Very poor        |
| 25–49   | Orange  | Poor             |
| 50–64   | Fair    | Fair             |
| 65–79   | Good    | Good             |
| 80–100  | Green   | Excellent        |

These bands align with “red &lt; 25”, “orange &lt; 50”, and “green 50–100” from the algorithm above.
