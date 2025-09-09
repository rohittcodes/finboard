import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const financeApi = createApi({
  reducerPath: 'financeApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
});

export const { } = financeApi;