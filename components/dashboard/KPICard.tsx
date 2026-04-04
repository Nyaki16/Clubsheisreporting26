"use client";

import { isInverseMetric, getBadgeColor } from "@/lib/calculations";
import { DollarSign, Users, UserPlus, Target, Camera, Globe, CheckCircle, Mail, CreditCard, ShoppingCart, TrendingDown, Percent, ThumbsUp, Eye, Heart } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  dollar: DollarSign,
  users: Users,
  "user-plus": UserPlus,
  target: Target,
  instagram: Camera,
  globe: Globe,
  "check-circle": CheckCircle,
  mail: Mail,
  "credit-card": CreditCard,
  "shopping-cart": ShoppingCart,
  "trending-down": TrendingDown,
  percent: Percent,
  facebook: ThumbsUp,
  eye: Eye,
  heart: Heart,
};

const labelIconMap: Record<string, React.ElementType> = {
  "Total Revenue": DollarSign,
  "Paystack Revenue": CreditCard,
  "Ghutte Revenue": DollarSign,
  "Other Payments": DollarSign,
  "Active Memberships": Users,
  "Active Subscribers": Users,
  "New Contacts": UserPlus,
  "Total Ad Spend": Target,
  "Instagram Followers": Camera,
  "Organic Reach": Globe,
  "FB Engagements": Heart,
  "Facebook Followers": ThumbsUp,
  "FB Organic Reach": Eye,
  "IG Monthly Reach": Eye,
  "Engagement Rate": Percent,
  "Email Leads": Mail,
  "Failed Payments": TrendingDown,
  "Failed Transactions": TrendingDown,
  "Abandoned": ShoppingCart,
  "Opportunities Won": CheckCircle,
};

interface KPICardProps {
  label: string;
  value: string;
  badge?: string;
  direction?: "up" | "down" | "neutral";
  icon?: string;
}

export function KPICard({ label, value, badge, direction = "neutral", icon }: KPICardProps) {
  const inverse = isInverseMetric(label);
  const colors = getBadgeColor(direction, inverse);
  const IconComponent = (icon && iconMap[icon]) || labelIconMap[label];

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {IconComponent && <IconComponent className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-medium leading-tight">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold text-gray-900 font-sans">{value}</p>
      {badge && (
        <span
          className="inline-block mt-1.5 text-[0.65rem] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
