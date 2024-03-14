import { Schema, model, Document, ObjectId } from "mongoose";

export interface ComponentMetricDocument extends Document {
  componentID: string;
  value: number;
  status: "active" | "inactive";
  type: "input" | "output" | "storage" | "import";
  from: Date;
  to: Date;
}

interface ComponentMetric {
  componentID: string;
  value: number;
  status: "active" | "inactive";
  type: "input" | "output" | "storage" | "import";
  from: Date;
  to: Date;
}

export interface ComponentMetricInstantDocument extends Document {
  componentID: string;
  value: number;
  status: "active" | "inactive";
  type: "input" | "output" | "storage" | "import";
  time: Date;
}

interface ComponentMetricInstant {
  componentID: string;
  value: number;
  status: "active" | "inactive";
  type: "input" | "output" | "storage" | "import";
  time: Date;
}

const componentMetricInstantSchema = new Schema<ComponentMetricInstant>(
  {
    componentID: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
    type: {
      type: String,
      enum: ["input", "output", "storage", "import"],
      required: true,
    },
    time: {
      type: Date,
    },
  },
  { timestamps: true }
);

const componentMetricSchema = new Schema<ComponentMetric>(
  {
    componentID: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
    type: {
      type: String,
      enum: ["input", "output", "storage", "import"],
      required: true,
    },
    from: {
      type: Date,
      required: true,
    },
    to: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const ComponentMetricInstant = model<ComponentMetricInstant>(
  "component_metric_instant",
  componentMetricInstantSchema
);

const ComponentMetricHourly = model<ComponentMetric>(
  "component_metric_hourly",
  componentMetricSchema
);

const ComponentMetricDaily = model<ComponentMetric>(
  "component_metric_daily",
  componentMetricSchema
);

export { ComponentMetricInstant, ComponentMetricHourly, ComponentMetricDaily };
