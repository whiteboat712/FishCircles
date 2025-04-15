import http from "../utils/http";

export const getLikeCount = (targetId, targetType) => {
  return http.get(`/like/get?targetId=${targetId}&targetType=${targetType}`);
};

export const getLikeByUser = (userId) => {
  return http.get(`/like/user/${userId}`);
};

export const addLike = (targetId, targetType, userId) => {
  return http.get(
    `/like/add?targetId=${targetId}&targetType=${targetType}&userId=${userId}`
  );
};

export const deleteLike = (targetId, targetType, userId) => {
  return http.get(
    `/like/delete?targetId=${targetId}&targetType=${targetType}&userId=${userId}`
  );
};

export const confirm = (targetId, targetType, userId) => {
  return http.get(
    `/like/confirm?targetId=${targetId}&targetType=${targetType}&userId=${userId}`
  );
};
