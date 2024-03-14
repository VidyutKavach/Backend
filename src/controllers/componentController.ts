import { Request, Response } from "express";
import Component from "../models/components";
import Nanogrid from "../models/nanogrids";
import Type from "../models/types";
import {
  ComponentMetricInstant,
  ComponentMetricHourly,
  ComponentMetricDaily,
} from "../models/metrics";
import moment from "moment-timezone";

const add_component = async (req: Request, res: Response) => {
  try {
    var { componentID, name, type, latitude, longitude, capacity, properties } =
      req.body;
    componentID = componentID.toUpperCase();
    const existingComponent = await Component.findOne({
      $or: [{ componentID: componentID }, { name: name }],
    });
    if (existingComponent) {
      return res.status(400).json({
        success: false,
        message: "component already exists",
      });
    }

    type = type.toLowerCase();
    const typeid = await Type.findOne({ name: type });

    const data = await Component.create({
      componentID: componentID,
      name: name,
      type: typeid?._id,
      latitude: latitude,
      longitude: longitude,
      capacity: capacity,
      properties: properties,
    });

    res.status(200).json({
      success: true,
      message: "component added successfully",
      data: data ?? {},
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const add_type = async (req: Request, res: Response) => {
  try {
    const { name, source_type } = req.body;
    const data = await Type.create({
      name: name.toLowerCase(),
      source_type: source_type,
    });

    return res.status(200).json({
      success: true,
      message: "type added successfully",
      data: data,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const add_nanogrid = async (req: Request, res: Response) => {
  try {
    const { nanogridID, name, components } = req.body;

    const existingNanogrid = await Nanogrid.findOne({
      $or: [{ nanogridID: nanogridID }, { name: name }],
    });

    if (existingNanogrid) {
      return res.status(400).json({
        success: false,
        message: "nanogrid already exists",
      });
    }

    const data = await Nanogrid.create({
      nanogridID: nanogridID,
      name: name,
      components: components,
    });

    return res.status(200).json({
      success: true,
      message: "nanogrid added successfully",
      data: data,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const add_nanogrid_component = async (req: Request, res: Response) => {
  try {
    const { name, components } = req.body;

    const existingNanogrid = await Nanogrid.findOne({ name: name });

    if (!existingNanogrid) {
      return res.status(404).json({
        success: false,
        message: "Nanogrid not found",
      });
    }

    const updatedComponents = [...components, ...existingNanogrid.components];

    existingNanogrid.components = updatedComponents;

    const updatedNanogrid = await existingNanogrid.save();

    return res.status(200).json({
      success: true,
      message: "Component added successfully",
      data: updatedNanogrid,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getActiveComponents = async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const pipeline = [
      {
        $lookup: {
          from: "types",
          localField: "type",
          foreignField: "_id",
          as: "typeInfo",
        },
      },
      {
        $unwind: "$typeInfo",
      },
      {
        $match: {
          "typeInfo.source_type": type,
        },
      },
      {
        $project: {
          componentID: 1,
          name: 1,
          latitude: 1,
          longitude: 1,
          capacity: 1,
          properties: 1,
          type: "$typeInfo.name",
        },
      },
    ];
    const result = await Component.aggregate(pipeline);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getLogsForGraph = async (req: Request, res: Response) => {
  try {
    const today = moment().tz("Asia/Kolkata").toDate();
    today.setHours(today.getHours() + 5);
    today.setMinutes(today.getMinutes() + 30);
    const pipeline = [
      {
        $match: {
          from: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Within the last 24 hours
        },
      },
      {
        $lookup: {
          from: "components",
          localField: "componentID",
          foreignField: "componentID",
          as: "component",
        },
      },
      {
        $unwind: "$component",
      },
      {
        $lookup: {
          from: "types",
          localField: "component.type",
          foreignField: "_id",
          as: "type",
        },
      },
      {
        $unwind: "$type",
      },
      {
        $addFields: {
          hour: { $hour: "$from" },
        },
      },
      {
        $group: {
          _id: {
            type: "$type.name",
            hour: "$hour",
          },
          totalPower: {
            $sum: {
              $cond: {
                if: { $eq: ["$type.source_type", "input"] },
                then: "$value",
                else: 0,
              },
            },
          },
          logs: { $push: "$$ROOT" },
        },
      },
      {
        $group: {
          _id: "$_id.type",
          hourlyData: {
            $push: {
              hour: "$_id.hour",
              totalPower: "$totalPower",
              logs: "$logs",
            },
          },
          totalPower: { $sum: "$totalPower" },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          totalPower: 1,
          hourlyData: 1,
        },
      },
    ];
    const result = await ComponentMetricHourly.aggregate(pipeline);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const grid_monitor = async () => {
  try {
    const result = await Component.aggregate([
      // Fetch all components
      {
        $lookup: {
          from: "components",
          pipeline: [],
          as: "components",
        },
      },
      // Unwind the components array
      { $unwind: "$components" },
      // Lookup the latest document from component_metric_instant based on componentID
      {
        $lookup: {
          from: "component_metric_instants",
          let: { componentID: "$components.componentID" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$componentID", "$$componentID"] },
              },
            },
            // Sort documents by time in descending order
            { $sort: { time: -1 } },
            // Get the latest document
            { $limit: 1 },
          ],
          as: "latestMetric",
        },
      },
      // Replace components with the latestMetric if it exists
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              { $arrayElemAt: ["$latestMetric", 0] },
              "$components",
            ],
          },
        },
      },
      // Project to include only necessary fields
      {
        $project: {
          _id: 0, // Exclude _id field
          componentID: "$componentID",
          name: "$name",
          value: "$value",
          status: "$status",
        },
      },
      // Group by componentID to get only the latest metric for each component
      {
        $group: {
          _id: "$componentID",
          name: { $first: "$name" },
          value: { $first: "$value" },
          status: { $first: "$status" },
        },
      },
    ]);
    if (result) {
      return { success: true, data: result };
    }
  } catch (err) {
    console.error(err);
    return;
  }
};
export {
  add_component,
  add_type,
  add_nanogrid,
  add_nanogrid_component,
  getActiveComponents,
  getLogsForGraph,
  grid_monitor,
};
