import { Image, ImageStyle, StyleProp } from "react-native";

type LogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export default function Logo({ size = 120, style }: LogoProps) {
  return (
    <Image
      source={require("../../assets/images/tapas-logo.jpg")}
      style={[{ width: size, height: size, borderRadius: size * 0.5 }, style]}
      resizeMode="contain"
      accessibilityLabel="Tapas Restaurant and Bar logo"
    />
  );
}
