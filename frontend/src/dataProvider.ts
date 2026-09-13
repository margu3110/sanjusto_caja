import fakeDataProvider from "ra-data-fakerest";

export default fakeDataProvider({
  customers: [
    {
      id: 1,
      name: "@ Mun de San Justo",
    },
    {
      id: 2,
      name: "Cooperativa de Agua",
    },
  ],

  categories: [
    {
      id: 1,
      name: "ALQ MINICARGADORA",
    },
    {
      id: 2,
      name: "ALQUILER AMBULANCIA",
    },
  ],

  users: [
    {
      id: 1,
      username: "admin",
    },
  ],
});