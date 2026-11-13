# Caregiver onboarding audit — November 13, 2026

## Confirmed live state

- One connected caregiver link, with connected timestamp and no TTL expiry attribute.
- Authorized primary safety contact, SMS requested, number unverified, SMS/push consent false.
- Camera status, events, recordings, live view and unrecorded Talk granted to the new link.
- Camera registry contains one online camera and two removed entries. Registry status alone is not proof of live video/audio delivery.
- Verification handler targets the Banxito-account SMS dispatcher.
- The deployed safety-check worker has no SMS dispatcher, safety-contact table or SMS activation timestamp configured, and no Connect phone-call route. Automatic emergency outreach is not ready merely because verification works.

## Repairs

The invitation page used server-rendered state but never refreshed. Add five-second visible-page refresh, refresh on focus, and a manual check button; connected links redirect to the dashboard. Pending dashboard connections refresh too. Revoked invitations no longer display a usable-looking old code page.

Replace the dashboard placeholder with explicit contact/SMS steps and a direct Look-In link. Existing Look-In provides room preview cards, connection status, live viewing, Talk, event filters and permitted recording playback. Permissions are not expanded by the checklist.

The preceding backend hotfix removes invitation expiry when the code is redeemed and when a proposal is answered. An accepted connection does not need re-entering every seven days. Deleted old grants are not recreated from cached contacts.

## Checks performed

- Contact creation/normalization/ownership tests; invitation expiry and foreign-household rejection tests.
- Consent isolation, save-conflict handling, verification expiry/single-use/attempt limits and mocked SMS queueing.
- Room scope, events, recordings, live signaling, privacy, expiry and revocation tests.
- Refresh lifecycle test: visible polling, hidden-page pause, focus/manual refresh and unmount cleanup.
- Next production build.

No real SMS or phone call was sent. No real camera conversation was started. Device/browser acceptance remains: request a verification text from the caregiver account, enter the received code, save SMS consent, confirm a real live view and event recording in Look-In, test Talk with someone at the camera, and test Get Help calling the selected contact. These cannot be represented as completed by mocked tests.

## Calling versus Talk

The senior's Get Help call opens the phone dialer after confirmation, using the contact marked “Call this person first.” This is separate from the backend safety role and from browser Talk, which uses the camera audio connection. Selecting a backend Primary role alone does not currently set the phone's preferred dialer contact.
