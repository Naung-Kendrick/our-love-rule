# Security Specification - Our Love Rules

## Data Invariants
1. A Room must have at least one partner (the creator).
2. Rules, Vows, and Memories must belong to a Room.
3. Only partners in a Room can read or write data in that Room.
4. Users can only edit their own profile.
5. Room codes must be unique and valid strings.
6. A user can only be in one room at a time (ideally).

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Room Hijacking**: Attempt to join a room where you are not authorized.
3. **Data Snooping**: Attempt to read rules/vows from a room you aren't part of.
4. **Ghost Rule**: Attempt to create a rule in a room without being a member.
5. **Admin Injection**: Attempt to set a `role: 'admin'` field on a user profile.
6. **Impedance Attack**: Send a 1MB string as a rule text.
7. **Orphaned Memory**: Create a memory in a non-existent room.
8. **Date Poisoning**: Set `startDate` to a value 50 years in the future.
9. **Identity Theft**: Update a rule created by your partner.
10. **Shadow Field**: Add `isVerified: true` to a rule document during update.
11. **Terminal Lock Breach**: (N/A for this app simple state, but good to keep in mind).
12. **Mass Delete**: Attempt to delete the entire rooms collection as a non-admin.

## Test Runner (Conceptual)
Verified operations:
- `get` /users/UID -> Only if request.auth.uid == UID
- `create` /rooms/ID -> If code is valid and creator is partner1
- `list` /rooms/ID/rules -> Only if user is partner1 or partner2
- `update` /rooms/ID/rules/RID -> Only if user created the rule or is partner. (Wait, maybe only author can edit, partner can only toggle `isDone`?)
