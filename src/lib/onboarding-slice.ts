import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentStep: 0,
  formData: {
    nickname: '',
    avatar: null,
    games: [],
  },
};

const onboardingStudentsSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setCurrentStep(state, action) {
      state.currentStep = action.payload;
    },
    updateFormData(state, action) {
      state.formData = { ...state.formData, ...action.payload };
    },
  },
});

export const { setCurrentStep, updateFormData } = onboardingStudentsSlice.actions;
export default onboardingStudentsSlice.reducer;