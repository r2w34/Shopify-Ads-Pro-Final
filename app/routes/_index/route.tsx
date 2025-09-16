import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // For embedded apps, if shop parameter is present, redirect to app
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // For embedded apps, we don't show the manual form
  // The app should be installed through Shopify's app installation flow
  return { showForm: false };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.heading}>🚀 FB AI Ads Pro</h1>
          <p className={styles.tagline}>
            AI-Powered Facebook Advertising Optimization for Shopify Stores
          </p>
          <p className={styles.description}>
            Maximize your Facebook ad performance with advanced machine learning, 
            competitive intelligence, and automated campaign optimization.
          </p>
        </div>



        <div className={styles.features}>
          <h2 className={styles.featuresTitle}>🎯 Powerful AI Features</h2>
          <ul className={styles.list}>
            <li>
              <strong>🤖 AI Campaign Optimization</strong>. Advanced machine learning algorithms 
              automatically optimize your Facebook ad campaigns for maximum ROI and performance.
            </li>
            <li>
              <strong>🔍 Competitive Intelligence</strong>. Real-time competitor analysis and 
              market insights to stay ahead of your competition with data-driven strategies.
            </li>
            <li>
              <strong>📊 Predictive Analytics</strong>. TensorFlow-powered performance predictions 
              help you make informed decisions before launching campaigns.
            </li>
            <li>
              <strong>🎨 AI Content Generation</strong>. Gemini AI-powered ad copy and creative 
              suggestions that convert better and engage your target audience.
            </li>
            <li>
              <strong>⚡ Real-time Optimization</strong>. Reinforcement learning agent continuously 
              improves your campaigns based on performance data and market conditions.
            </li>
            <li>
              <strong>📈 Advanced Analytics</strong>. Comprehensive performance insights with 
              actionable recommendations to scale your advertising success.
            </li>
          </ul>
        </div>

        <div className={styles.benefits}>
          <h2 className={styles.benefitsTitle}>💰 Why Choose FB AI Ads Pro?</h2>
          <div className={styles.benefitGrid}>
            <div className={styles.benefit}>
              <h3>🎯 Higher ROAS</h3>
              <p>Increase your return on ad spend by up to 300% with AI-driven optimization</p>
            </div>
            <div className={styles.benefit}>
              <h3>⏰ Save Time</h3>
              <p>Automate campaign management and focus on growing your business</p>
            </div>
            <div className={styles.benefit}>
              <h3>📊 Data-Driven</h3>
              <p>Make informed decisions with comprehensive analytics and insights</p>
            </div>
            <div className={styles.benefit}>
              <h3>🚀 Scale Faster</h3>
              <p>Identify winning strategies and scale successful campaigns automatically</p>
            </div>
          </div>
        </div>

        <div className={styles.cta}>
          <h2>Ready to Transform Your Facebook Advertising?</h2>
          <p>Join thousands of Shopify merchants who trust FB AI Ads Pro to grow their business.</p>
          <p><strong>Install this app from your Shopify Admin → Apps → App Store</strong></p>
        </div>
      </div>
    </div>
  );
}
