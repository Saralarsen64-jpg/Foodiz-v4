export function useWeelloStripe() {
  return {
    initPaymentSheet: async () => ({
      error: {
        message: 'Le paiement natif doit être testé sur iOS ou Android.',
      },
    }),
    presentPaymentSheet: async () => ({
      error: {
        code: 'Failed',
        message: 'Le paiement natif doit être testé sur iOS ou Android.',
      },
    }),
  };
}
