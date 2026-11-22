# Errors to fix
## csv import error

**Error**: `Query did not return a unique result: 3 results were returned` for Row 0 during CSV import.

**Cause**: During CSV import in API mode, the raw category name from the CSV was sent to the backend, which tried to find it in the database. When multiple categories matched the name, the query returned a non-unique result.

**Fix**: Added category name resolution in `BudgetContext.tsx` → `addTransactions()`. Before building the batch request, existing categories are fetched from the API (`apiClient.getCategories`). Each CSV category name is matched case-insensitively against the existing categories. The exact stored name is used, ensuring the backend finds exactly one match. If the categories API fails, original names are used as fallback.

**Verification**: `addTransactions.test.tsx` updated to mock the categories endpoint and verify:
- Categories are correctly resolved (case-insensitive match → exact stored name)
- Original names are preserved when categories API fails
- Server errors still propagate to the caller