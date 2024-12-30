import onboardingStudentsSlice from "@/lib/onboarding-slice";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    onboarding: onboardingStudentsSlice,
  },
});