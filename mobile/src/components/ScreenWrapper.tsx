import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

interface ScreenWrapperProps {
    children: React.ReactNode;
    extraBottomPadding?: number;
}

export default function ScreenWrapper({
    children,
    extraBottomPadding = 0,
}: ScreenWrapperProps) {
    return (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <KeyboardAwareScrollView
                style={styles.flex}
                contentContainerStyle={[
                    styles.scrollContent,
                    extraBottomPadding > 0 && { paddingBottom: extraBottomPadding },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                // Automatically scrolls to focused input, PLUS an extra 80px to show buttons
                enableOnAndroid={true}
                extraHeight={Platform.OS === "android" ? 120 : 80}
                extraScrollHeight={Platform.OS === "android" ? 120 : 80}
                enableAutomaticScroll={true}
                keyboardOpeningTime={Number.MAX_SAFE_INTEGER} // Prevent jarring scroll jumps on Android
            >
                {children}
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#000000",
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        // Allows content to fill the screen but also expand if keyboard pushes it
        flexGrow: 1,
        paddingBottom: 40,
    },
});
