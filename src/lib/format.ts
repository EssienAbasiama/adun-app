/** ₦13,500 - formatted by hand so it is identical on Hermes, iOS and Android. */
export const money = (n: number) => "₦" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const pad2 = (n: number) => String(n).padStart(2, "0");

