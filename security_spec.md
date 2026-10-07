# Security Specification: FinanzaSimple

## 1. Data Invariants
1. Each user's data (UserProfile, Transactions, Recurring Payments, Credit Cards) is strictly scoped under `/users/{userId}/*`.
2. A user can only read, create, update, and delete their own documents where path `{userId}` matches `request.auth.uid`.
3. Anonymous or unauthenticated users cannot read or write any user records.
4. Transaction amounts, recurring amounts, and card limits must be non-negative finite numbers.
5. Path variables must conform to valid document IDs (alphanumeric, dashes, underscores, max length 128).
6. Required schema fields must be present and unexpected fields are forbidden.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user123/transactions` without `request.auth`.
2. **Cross-Tenant Read**: User A querying `/users/userB/transactions`.
3. **Cross-Tenant Injection**: User A writing a transaction into `/users/userB/transactions/tx1`.
4. **ID Poisoning Attack**: Passing a 2KB garbage string as `{transactionId}`.
5. **Negative Amount Exploit**: Creating a transaction with `amount: -50000` to manipulate summaries.
6. **Shadow Field Injection**: Injecting `{ "isAdmin": true, "verified": true }` into a transaction or profile.
7. **Type Confusion**: Passing `amount: "fifty-thousand"` instead of numeric float/integer.
8. **Missing Mandatory Fields**: Omitting `type`, `amount`, or `date` in a transaction.
9. **Tampering User Identity**: User A updating user profile of User B.
10. **Array Flooding Attack**: Sending unbounded payloads with massive array lengths.
11. **Orphan Card Reference**: Deleting or creating transactions without authenticated user context.
12. **Timestamp Forgery**: Spoofing system update timestamps with invalid strings.

## 3. Test Runner Invariants
All payloads from the Dirty Dozen must be rejected with `PERMISSION_DENIED` by Firestore security rules.
