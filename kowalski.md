# Kowalski Memory

> "I never forget a dataset, Skipper. It's all up here."

This file stores Kowalski's memory across sessions. Feel free to commit it with your repo.

## Kowalski Intel

### Known Datasets

- `sales.csv`: 32 rows, columns: date, region, product, revenue, units, ... +1 more
  - revenue: up trend (24.2%)
  - units: up trend (24.2%)

### User Preferences

- Chart type: auto
- Export format: png
- Color scheme: kowalski

### Mission Log

- Total missions: 1
- Last updated: 2026-01-13T09:28:50.491Z

```json
{
  "version": "1.0",
  "lastUpdated": "2026-01-13T09:28:50.491Z",
  "datasets": [
    {
      "fingerprint": {
        "name": "sales.csv",
        "rowCount": 32,
        "columns": [
          "date",
          "region",
          "product",
          "revenue",
          "units",
          "cost"
        ],
        "columnHash": "b920d625",
        "sampleHash": "1f3f81f7"
      },
      "firstSeen": "2026-01-13T09:28:02.518Z",
      "lastAnalyzed": "2026-01-13T09:28:50.491Z",
      "analysisCount": 2,
      "columnSemantics": [],
      "relationships": [],
      "findings": [
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between revenue and units",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:02.519Z"
        },
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between revenue and cost",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:02.519Z"
        },
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between units and cost",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:02.519Z"
        },
        {
          "type": "trend",
          "summary": "revenue: up trend (24.2%)",
          "confidence": 70,
          "timestamp": "2026-01-13T09:28:02.519Z"
        },
        {
          "type": "trend",
          "summary": "units: up trend (24.2%)",
          "confidence": 70,
          "timestamp": "2026-01-13T09:28:02.519Z"
        },
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between revenue and units",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:50.491Z"
        },
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between revenue and cost",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:50.491Z"
        },
        {
          "type": "correlation",
          "summary": "strong correlation (r=1.00) between units and cost",
          "confidence": 100,
          "timestamp": "2026-01-13T09:28:50.491Z"
        },
        {
          "type": "trend",
          "summary": "revenue: up trend (24.2%)",
          "confidence": 70,
          "timestamp": "2026-01-13T09:28:50.491Z"
        },
        {
          "type": "trend",
          "summary": "units: up trend (24.2%)",
          "confidence": 70,
          "timestamp": "2026-01-13T09:28:50.491Z"
        }
      ]
    }
  ],
  "preferences": {
    "chartType": "auto",
    "colorScheme": "kowalski",
    "exportFormat": "png",
    "autoSpawnDashboard": true,
    "verbosityLevel": "normal"
  },
  "missionCount": 1
}
```

<!-- /Kowalski Intel -->
