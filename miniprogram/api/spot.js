import http from "../utils/http";

export const reqAllSpots = () => {
  return http.get("/fishingSpot/all");
};

export const reqSearchSpot = (query) => {
  return http.get(`/fishingSpot/search?query=${query}`);
};

export const reqAddSpot = (
  spotName,
  description,
  images,
  latitude,
  longitude,
  fee,
  submittedBy
) => {
  return http.post(
    `/fishingSpot/add?spotName=${spotName}&description=${description}&images=%5B${images}%5D&latitude=${latitude}&longitude=${longitude}&fee=${fee}&submittedBy=${submittedBy}`
  );
};

export const reqSpotData = (spotId) => {
  return http.get(`/fishingSpot/${spotId}`);
};
