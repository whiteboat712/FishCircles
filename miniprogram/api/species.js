import http from "../utils/http";

export const getAllSpecies = () => {
  return http.get(`/fishSpecies/all`);
};

export const getSpeciesBySpot = (spotId) => {
  return http.get(`/fishSpecies/spot/${spotId}`);
};

export const addSpecies = (speciesName) => {
  return http.post(`/fishSpecies/add?speciesName=${speciesName}`);
};

export const deleteSpecies = (speciesName) => {
  return http.post(`/fishSpecies/delete?speciesName=${speciesName}`);
};

export const addSpeciesToSpot = (spotId, speciesId) => {
  return http.get(
    `/fishSpecies/spot/add?spotId=${spotId}&speciesId=${speciesId}`
  );
};

export const searchSpecies = (query) => {
  return http.get(`/fishSpecies/search?query=${query}`);
};
