import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest } from "../simphony/client.js";

export const organizationsRouter = Router();

organizationsRouter.get(
  "/api/v1/organizations",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/organizations",
      query: req.query as Record<string, string>,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/organizations/:orgShortName",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/organizations/${req.params.orgShortName}`,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/organizations/:orgShortName/locations",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/organizations/${req.params.orgShortName}/locations`,
      query: req.query as Record<string, string>,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/organizations/:orgShortName/locations/:locRef",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/organizations/${req.params.orgShortName}/locations/${req.params.locRef}`,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/organizations/:orgShortName/locations/:locRef/revenueCenters",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/organizations/${req.params.orgShortName}/locations/${req.params.locRef}/revenueCenters`,
      query: req.query as Record<string, string>,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/organizations/:orgShortName/locations/:locRef/revenueCenters/:rvcRef",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/organizations/${req.params.orgShortName}/locations/${req.params.locRef}/revenueCenters/${req.params.rvcRef}`,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/search/locations",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/search/locations",
      query: req.query as Record<string, string>,
    });
    res.status(status).json(data);
  })
);

organizationsRouter.get(
  "/api/v1/search/revenueCenters",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/search/revenueCenters",
      query: req.query as Record<string, string>,
    });
    res.status(status).json(data);
  })
);
