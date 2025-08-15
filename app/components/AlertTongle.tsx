import { Alert, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { Text } from "@/components/Text"
import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"


export interface AlertTongleProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

type AlertItem = {
  title: string
  message: string
  buttons?: Array<{
    text: string
    onPress?: () => void
    style?: 'default' | 'cancel' | 'destructive'
  }>
}

// Static queue manager
class AlertQueueManager {
  private static queue: AlertItem[] = []
  private static isShowing = false
  private static currentAlert: AlertItem | null = null

  static enqueue(alert: AlertItem) {
    if (this.isDuplicate(alert)) return

    this.queue.push(alert)
    this.showNext()
  }

  private static isDuplicate(alert: AlertItem): boolean {
    if (this.isShowing && this.currentAlert?.title === alert.title && this.currentAlert?.message === alert.message) {
      return true
    }
    if (this.queue.some(q => q.title === alert.title && q.message === alert.message)) {
      return true
    }
    return false
  }

  private static showNext() {
    if (this.isShowing || this.queue.length === 0) return

    this.isShowing = true
    const nextAlert = this.queue.shift()!
    this.currentAlert = nextAlert

    const { title, message, buttons = [{ text: "OK" }] } = nextAlert

    Alert.alert(title, message, buttons.map(button => ({
      ...button,
      onPress: () => {
        button.onPress?.()
        this.isShowing = false
        this.currentAlert = null
        this.showNext()
      },
    })))
  }
}

// Exportable function
export const showQueuedAlert = (alert: AlertItem) => {
  AlertQueueManager.enqueue(alert)
}


// COMPONENT
export const AlertTongle = observer(function AlertTongle(props: AlertTongleProps) {
  const { style } = props
  const $styles = [$container, style]
  const { themed } = useAppTheme()

  useEffect(() => {
    // Example trigger
    showQueuedAlert({
      title: "Initial Alert",
      message: "This is triggered from AlertTongle component",
    })
  }, [])

  return (
    <View style={$styles}>
      <Text style={themed($text)}>Hello</Text>
    </View>
  )
})

const $container: ViewStyle = {
  justifyContent: "center",
}

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})
