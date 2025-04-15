import http from "../utils/http";

export const reqProfileData = () => {
  return Promise.all([]);
};

export const reqUserData = (id) => {
  return http.get(`/account/get/${id}`);
};

export const login = (username, password) => {
  return http.post("/account/login", {
    username,
    password,
  });
};

export const register = (username, password) => {
  return http.post(
    `/account/register?username=${username}&password=${password}`
  );
};

export const update = (user) => {
  return http.post("/account/update/user", user);
};
