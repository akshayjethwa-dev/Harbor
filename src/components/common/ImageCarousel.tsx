// src/components/common/ImageCarousel.tsx
import React, { useState } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = width * 1.2; // Standard aspect ratio for profile photos

interface Props {
  images: string[];
  fallbackInitial?: string;
}

export default function ImageCarousel({ images, fallbackInitial = "?" }: Props) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter out empty strings or nulls
  const validImages = images.filter((url) => !!url);

  if (validImages.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.fallback,
          { backgroundColor: colors.bgSubtle },
        ]}
      >
        <Image
          source={{ uri: "https://via.placeholder.com/400x600?text=No+Photo" }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={validImages}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
        )}
      />

      {/* Pagination Dots */}
      {validImages.length > 1 && (
        <View style={styles.pagination}>
          {validImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex ? colors.primary : "rgba(255,255,255,0.5)",
                  width: index === activeIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    alignSelf: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});