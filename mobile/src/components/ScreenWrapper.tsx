import React from "react";
import { StyleSheet, Platform, ScrollView, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
            <KeyboardAvoidingView
                style={styles.flex}
                // On iOS, we MUST use padding behavior otherwise it ignores keyboard
                // On Android, we MUST use undefined so that native adjustResize takes over physically
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.scrollContent,
                        extraBottomPadding > 0 && { paddingBottom: extraBottomPadding },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    // Auto inset adjustments required for iOS, mostly ignored/unnecessary on Android
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                >
                    {/* Wrap children in a static view that never squishes itself via flex, enabling robust ScrollView overflow */}
                    <View style={styles.contentWrap}>
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        flexGrow: 1,
        paddingBottom: 40,
    },
    contentWrap: {
        flexGrow: 1,
        // No explicit height or flex:1 here! 
        // This ensures children maintain natural heights and overspill natively.
    }
});
