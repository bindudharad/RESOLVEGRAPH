# REPORT 05 — FEATURE 02: CANONICAL TRANSACTION ENGINE

## 1. Overview
Financial arithmetic requires zero floating-point drift. The Canonical Transaction Engine standardizes all currency representations to integer minor units (cents, paise).

## 2. Proportional Refund Allocation
Implements the largest-remainder method (Hamilton-Hare method) to allocate fractional refund portions across multiple line items or dispute claims without losing or gaining a single penny.

## 3. Status Normalization
Maps raw provider statuses (e.g. PayPal `COMPLETED`, Stripe `succeeded`, UPI `SUCCESS`, Bank `SETTLED`) into a unified canonical lifecycle:
`COMPLETED`, `PENDING`, `AUTHORIZED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
