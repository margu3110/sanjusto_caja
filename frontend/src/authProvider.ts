export const authProvider = {
  login: ({ username }: any) => {
    localStorage.setItem("user", username);
    return Promise.resolve();
  },

  logout: () => {
    localStorage.removeItem("user");
    return Promise.resolve();
  },

  checkAuth: () =>
    localStorage.getItem("user")
      ? Promise.resolve()
      : Promise.reject(),

  checkError: () => Promise.resolve(),
  getPermissions: () => Promise.resolve(),
};