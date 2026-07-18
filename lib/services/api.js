"use client";

// Central re-export — mirrors Frontend4/src/services/api.js. Components
// import `{ printerService }` and get every domain service merged together.
import api, { API_URL } from "@/lib/client/apiClient";

import { authService } from "./authService";
import { companyService } from "./companyService";
import { productService } from "./productService";
import { modelsService } from "./modelsService";
import { serialsService } from "./serialsService";
import { dispatchService } from "./dispatchService";
import { installationsService } from "./installationsService";
import { returnsService } from "./returnsService";
import { reportsService } from "./reportsService";
import { ordersService } from "./ordersService";
import { dashboardService } from "./dashboardService";
import { exportService } from "./exportService";
import { tagsService } from "./tagsService";
import { fbfFbaService } from "./fbfFbaService";
import { modelApprovalsService } from "./modelApprovalsService";
import { delhiveryService } from "./delhiveryService";
import { delhiveryB2BService } from "./delhiveryB2BService";
import { contractsService } from "./contractsService";

export { API_URL };

export const printerService = {
  ...authService,
  ...companyService,
  ...productService,
  ...modelsService,
  ...serialsService,
  ...dispatchService,
  ...installationsService,
  ...returnsService,
  ...reportsService,
  ...ordersService,
  ...dashboardService,
  ...exportService,
  ...tagsService,
  ...fbfFbaService,
  ...modelApprovalsService,
  ...delhiveryService,
  ...delhiveryB2BService,
  ...contractsService,
};

export default api;
