# REPORT 17 — SECONDARY HACKATHON DEMO: "UPI DEBITED-NOT-CREDITED DISPUTE"

## Demonstration Scenario
Customer initiates ₹1,499 UPI transaction to merchant. Funds debited from bank, but merchant cart dropped.

## Demonstration Steps
1. Open `/multilingual` and select **"ಕನ್ನಡ Sample"** or **"हिन्दी Sample"**.
2. Witness real-time translation into canonical English and entity extraction (Amount: ₹1,499, Provider: PhonePe).
3. System identifies missing UTR reference and prompts user.
4. Investigation engine evaluates statutory RBI T+1 turnaround time and ₹100/day auto-reversal penalty.
