import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  Divider,
} from '@shopify/polaris';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  prefix?: string;
  suffix?: string;
}

export function MetricCard({ title, value, change, trend, prefix = '', suffix = '' }: MetricCardProps) {
  const getTrendColor = () => {
    if (!change) return 'subdued';
    if (trend === 'up') return 'success';
    if (trend === 'down') return 'critical';
    return 'subdued';
  };

  const getTrendIcon = () => {
    if (!change) return '';
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '→';
  };

  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodySm" color="subdued">
          {title}
        </Text>
        <Text variant="headingLg" as="h3">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </Text>
        {change !== undefined && (
          <InlineStack gap="100" align="center">
            <Text variant="bodySm" color={getTrendColor()}>
              {getTrendIcon()} {Math.abs(change)}%
            </Text>
            <Text variant="bodySm" color="subdued">
              vs last period
            </Text>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}

interface PerformanceChartProps {
  data: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  }>;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          📈 Performance Trends
        </Text>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name
                ]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                stroke="#8884d8"
                strokeWidth={2}
                name="Impressions"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Clicks"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spend"
                stroke="#ffc658"
                strokeWidth={2}
                name="Spend ($)"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="conversions"
                stroke="#ff7300"
                strokeWidth={2}
                name="Conversions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}

interface CampaignComparisonProps {
  campaigns: Array<{
    name: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
  }>;
}

export function CampaignComparison({ campaigns }: CampaignComparisonProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          🏆 Campaign Performance Comparison
        </Text>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={campaigns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="impressions" fill="#8884d8" name="Impressions" />
              <Bar dataKey="clicks" fill="#82ca9d" name="Clicks" />
              <Bar dataKey="spend" fill="#ffc658" name="Spend ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}

interface SpendBreakdownProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function SpendBreakdown({ data }: SpendBreakdownProps) {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          💰 Ad Spend Breakdown
        </Text>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Spend']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}

interface ConversionFunnelProps {
  data: {
    impressions: number;
    clicks: number;
    pageViews: number;
    addToCarts: number;
    purchases: number;
  };
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const funnelData = [
    { stage: 'Impressions', value: data.impressions, percentage: 100 },
    { stage: 'Clicks', value: data.clicks, percentage: (data.clicks / data.impressions) * 100 },
    { stage: 'Page Views', value: data.pageViews, percentage: (data.pageViews / data.impressions) * 100 },
    { stage: 'Add to Cart', value: data.addToCarts, percentage: (data.addToCarts / data.impressions) * 100 },
    { stage: 'Purchases', value: data.purchases, percentage: (data.purchases / data.impressions) * 100 },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          🎯 Conversion Funnel
        </Text>
        <BlockStack gap="300">
          {funnelData.map((item, index) => (
            <div key={item.stage}>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="bodyMd" fontWeight="medium">
                    {item.stage}
                  </Text>
                  <InlineStack gap="200">
                    <Text variant="bodyMd">
                      {item.value.toLocaleString()}
                    </Text>
                    <Badge status={item.percentage > 50 ? 'success' : item.percentage > 20 ? 'attention' : 'critical'}>
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </InlineStack>
                </InlineStack>
                <ProgressBar 
                  progress={item.percentage} 
                  size="small"
                />
              </BlockStack>
              {index < funnelData.length - 1 && <Divider />}
            </div>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

interface ROASChartProps {
  data: Array<{
    campaign: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
}

export function ROASChart({ data }: ROASChartProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          💎 Return on Ad Spend (ROAS)
        </Text>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="campaign" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'roas' ? `${value}x` : `$${value}`,
                  name === 'roas' ? 'ROAS' : name === 'spend' ? 'Spend' : 'Revenue'
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="spend"
                stackId="1"
                stroke="#ff7300"
                fill="#ff7300"
                name="Spend"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="2"
                stroke="#82ca9d"
                fill="#82ca9d"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}

interface AudienceInsightsProps {
  demographics: Array<{
    age: string;
    percentage: number;
    impressions: number;
  }>;
  devices: Array<{
    device: string;
    percentage: number;
    ctr: number;
  }>;
}

export function AudienceInsights({ demographics, devices }: AudienceInsightsProps) {
  return (
    <InlineStack gap="400" align="start">
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            👥 Age Demographics
          </Text>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={demographics} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="age" type="category" />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`,
                    'Percentage'
                  ]}
                />
                <Bar dataKey="percentage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            📱 Device Performance
          </Text>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={devices}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="percentage"
                  label={({ device, percentage }) => `${device}: ${percentage}%`}
                >
                  {devices.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#8884d8' : index === 1 ? '#82ca9d' : '#ffc658'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </BlockStack>
      </Card>
    </InlineStack>
  );
}