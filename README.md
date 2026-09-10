# Lisa & Me — caregiver portal

`caregiver.lisaandme.com`. The family-facing web surface. **Never used by the
senior** — her app is voice-only and typing-free, and that constraint does not
apply here.

## Running it

    cp .env.example .env.local     # then fill in the Cognito values
    npm install
    npm run dev

## What is here so far

Auth only, against the `lisa-caregivers` Cognito pool: sign up, verify, sign
in, sign out, and a dashboard that says whether a senior is connected yet.
The circle, the invite flow, Ask Lisa, and billing are not built.

## Two rules inherited from the product

1. **The senior is not surveilled.** The caregiver gets characterisations and
   status, never a transcript. Every inquiry is disclosed back to her.
2. **"Quiet" and "offline" are different things.** A dead phone is a phone
   problem and must never be dressed up as concern about a person.

The high-fidelity design (final copy, measured spacing) is in
`../Design brief feedback_ navigation and screens/handoff_caregiver_portal/`.
It is written against the old `care.lisacare.ai` domain; screens and strings
still apply, the domain does not.
