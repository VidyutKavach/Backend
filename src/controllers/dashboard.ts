import { Request, Response, NextFunction } from "express";
import Component from "../models/components";
import Type from "../models/types";
import {
  ComponentMetricDaily,
  ComponentMetricInstant,
  ComponentMetricHourly,
} from "../models/metrics";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const get_utility_grid_status = async () => {
  try {
    const utility_data = await ComponentMetricInstant.findOne({
      componentID: "UTILITY",
    })
      .sort({ createdAt: -1 })
      .exec();
    return {
      success: true,
      data: utility_data?.status,
    };
  } catch (err) {
    console.log(err);
    return;
  }
};

const get_grid_status = async () => {
  try {
    const result = await ComponentMetricInstant.aggregate([
      {
        $sort: { time: -1 },
      },
      {
        $group: {
          _id: {
            type: "$type",
            componentID: "$componentID",
          },
          latestDocument: { $first: "$$ROOT" },
        },
      },
      {
        $group: {
          _id: "$_id.type",
          elements: {
            $push: "$latestDocument",
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalValue: {
            $sum: "$elements.value",
          },
        },
      },
    ]);

    const maxStorageCapacity = await Component.aggregate([
      {
        $lookup: {
          from: "types",
          localField: "type",
          foreignField: "_id",
          as: "type_info",
        },
      },
      {
        $unwind: "$type_info",
      },
      {
        $match: {
          "type_info.source_type": "storage",
        },
      },
      {
        $group: {
          _id: null,
          totalStorageCapacity: { $sum: "$capacity" },
        },
      },
    ]);

    const totalCapacity = maxStorageCapacity[0].totalStorageCapacity;

    const storageType = result.find((item) => item._id === "storage");

    let dividedValue = 0;
    if (storageType) {
      dividedValue = (storageType.totalValue / totalCapacity) * 100;
      // Format to 2 decimal places
      storageType.totalValue = Number(dividedValue.toFixed(2));
    }

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    console.log(err);
    return;
  }
};

const get_weekly_data = async () => {
  try {
    const result = await Type.aggregate([
      {
        $lookup: {
          from: "components",
          localField: "_id",
          foreignField: "type",
          as: "components",
        },
      },
      {
        $unwind: "$components",
      },
      {
        $lookup: {
          from: "component_metric_dailies",
          let: { componentId: "$components.componentID" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$componentID", "$$componentId"] },
                    {
                      $gte: [
                        "$from",
                        { $subtract: [new Date(), 7 * 24 * 60 * 60 * 1000] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "metrics",
        },
      },
      {
        $unwind: {
          path: "$metrics",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$name",
          metrics: {
            $push: {
              value: "$metrics.value",
              from: "$metrics.from",
              to: "$metrics.to",
            },
          },
          totalWeeklyValue: {
            $sum: {
              $sum: "$metrics.value",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          metrics: 1,
          totalWeeklyValue: 1,
        },
      },
    ]);
    return {
      success: true,
      data: result,
    };
  } catch (err) {
    console.log(err);
    return;
  }
};

const active_counts = async () => {
  try {
    const activeCounts = await Type.aggregate([
      {
        $lookup: {
          from: "components",
          localField: "_id",
          foreignField: "type",
          as: "components",
        },
      },
      {
        $unwind: "$components",
      },
      {
        $lookup: {
          from: "component_metric_instants",
          let: { componentId: "$components.componentID" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$componentID", "$$componentId"],
                },
              },
            },
            {
              $sort: { createdAt: -1 }, // Sort by createdAt in descending order (latest first)
            },
            {
              $limit: 1, // Limit to the latest created document
            },
          ],
          as: "latestMetricInstance",
        },
      },
      { $unwind: "$latestMetricInstance" },
      {
        $group: {
          _id: "$name", // Group by type name
          activeCount: {
            $sum: {
              $cond: [
                { $eq: ["$latestMetricInstance.status", "active"] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          typeName: "$_id",
          activeCount: 1,
        },
      },
    ]);
    return {
      success: true,
      data: activeCounts,
    };
  } catch (err) {
    console.log(err);
    return;
  }
};

const get_dashboard = async () => {
  try {
    const utility_status_response = await get_utility_grid_status();
    const grid_status_response = await get_grid_status();
    const weekly_data_response = await get_weekly_data();
    const active_components_response = await active_counts();

    const utility_status = utility_status_response
      ? utility_status_response.data
      : {};
    const grid_status = grid_status_response ? grid_status_response.data : {};
    const weekly_data = weekly_data_response ? weekly_data_response.data : {};
    const active_components = active_components_response
      ? active_components_response.data
      : {};
    const co2_emission = {
      vslue: 90,
      unit: "kg/MWh",
    };
    const energy_efficiency = {
      value: 90,
      unit: "%",
    };

    return {
      success: true,
      utility_status,
      grid_status,
      weekly_data,
      active_components,
      co2_emission,
      energy_efficiency,
    };
  } catch (err) {
    console.error(err);
    return;
  }
};

export { get_dashboard };
