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

const get_utility_grid_status = async (req: Request, res: Response) => {
  try {
    const utility_data = await ComponentMetricInstant.findOne({
      componentID: "UTILITY",
    })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json({
      success: true,
      data: utility_data?.status,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const get_grid_status = async (req: Request, res: Response) => {
  try {
    const result = await ComponentMetricInstant.aggregate([
      {
        $sort: { createdAt: -1 },
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

    const dividedValue = storageType
      ? (storageType.totalValue / totalCapacity) * 100
      : 0;

    if (storageType) {
      storageType.totalValue = dividedValue;
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const get_weekly_data = async (req: Request, res: Response) => {
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
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const active_counts = async (req: Request, res: Response) => {
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
    return res.status(200).json({
      success: true,
      data: activeCounts,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const get_dashboard = async (req: Request, res: Response) => {
  try {
    const utility_status_response = await axios.get(
      `${process.env.DEPLOYMENT}/dashboard/get_utility_status`
    );
    const grid_status_response = await axios.get(
      `${process.env.DEPLOYMENT}/dashboard/get_grid_status`
    );
    const weekly_data_response = await axios.get(
      `${process.env.DEPLOYMENT}/dashboard/get_weekly_data`
    );
    const active_components_response = await axios.get(
      `${process.env.DEPLOYMENT}/dashboard/active_count`
    );

    const utility_status = utility_status_response.data;
    const grid_status = grid_status_response.data;
    const weekly_data = weekly_data_response.data;
    const active_components = active_components_response.data;
    const ids = "active";
    const firewall = "active";
    const honeypot = {
      total: 3,
      active: 3,
      detections: 5,
    };
    const co2_emission = {
      vslue: 90,
      unit: "kg/MWh",
    };
    const energy_efficiency = {
      value: 90,
      unit: "%",
    };

    const security_alerts = [
      {
        id: 1,
        is_read: false,
        timestamp: "2023-12-17T04:26:04.643+00:00",
        ip: "192.168.1.105",
        description: "Detected attempt to perform SQL injection",
      },
      {
        id: 2,
        is_read: false,
        timestamp: "2023-12-17T04:26:04.643+00:00",
        ip: "192.168.1.215",
        description: "Suspicious script detected in input",
      },
      {
        id: 3,
        is_read: false,
        timestamp: "2023-12-17T04:26:04.643+00:00",
        ip: "192.168.1.135",
        description: "Multiple failed login attempts",
      },
      {
        id: 4,
        is_read: false,
        timestamp: "2023-12-17T04:26:04.643+00:00",
        ip: "192.168.1.185",
        description: "System configuration changed",
      },
      {
        id: 5,
        is_read: false,
        timestamp: "2023-12-17T04:26:04.643+00:00",
        ip: "192.168.1.250",
        description: "Detected attempt to spoof DNS responses",
      },
    ];
    const system_health: any = [];
    const honeypot_detection: any = [];

    return res.status(200).json({
      success: true,
      utility_status,
      grid_status,
      weekly_data,
      active_components,
      ids,
      firewall,
      honeypot,
      co2_emission,
      energy_efficiency,
      security_alerts,
      system_health,
      honeypot_detection,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export {
  get_utility_grid_status,
  get_grid_status,
  get_weekly_data,
  active_counts,
  get_dashboard,
};
