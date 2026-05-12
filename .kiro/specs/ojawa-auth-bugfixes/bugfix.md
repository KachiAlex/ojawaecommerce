# Bugfix Requirements Document

## Introduction

This document addresses two critical bugs in the Ojawa e-commerce authentication flow:

1. **OTP Send Error**: When creating any account (buyer, vendor, or logistics), the OTP sending fails with "Email is required" error. The backend endpoint `/sendEmailOTP` returns a 400 error, preventing users from completing email verification during registration.

2. **Missing Dashboard Redirect After Verification**: After users verify their email, they are not redirected to their role-specific dashboard. The Register component lacks redirect logic, and the Login component redirects to a generic `/dashboard` without considering the user's role/type.

These bugs prevent users from completing the registration flow and accessing their appropriate dashboards after verification, significantly impacting the onboarding experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user creates a new account (buyer, vendor, or logistics) THEN the OTP sending fails with "Email is required" error and the user cannot proceed with email verification
1.2 WHEN a user verifies their email during registration THEN the user is not redirected to any dashboard and remains on the verification page
1.3 WHEN a user verifies their email and logs in THEN the user is redirected to a generic `/dashboard` route regardless of their role/type

### Expected Behavior (Correct)

2.1 WHEN a user creates a new account THEN the OTP is sent successfully to their email without errors
2.2 WHEN a user verifies their email during registration THEN the user SHALL be redirected to their role-specific dashboard (buyer → /buyer, vendor → /vendor, logistics → /logistics)
2.3 WHEN a user verifies their email and logs in THEN the user SHALL be redirected to their role-specific dashboard based on their user type

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is on the registration page without submitting the form THEN the page SHALL CONTINUE TO display the registration form with all fields visible
3.2 WHEN a user enters valid credentials and submits the registration form THEN the form submission SHALL CONTINUE TO work and trigger OTP sending (after fix)
3.3 WHEN a user is on the login page THEN the login form SHALL CONTINUE TO function and authenticate users correctly
3.4 WHEN a user is already logged in and visits the login page THEN the user SHALL CONTINUE TO be redirected to their dashboard
3.5 WHEN a user logs out THEN the user SHALL CONTINUE TO be redirected to the login page
3.6 WHEN a user navigates to their dashboard THEN the dashboard SHALL CONTINUE TO display their role-specific content
