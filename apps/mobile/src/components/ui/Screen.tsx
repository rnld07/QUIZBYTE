import { useEffect, useRef } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_TAB_BAR_HEIGHT } from '@/components/layout/FloatingTabBar';
import { registerScrollToTop } from '@/services/navigation/scrollToTop';
import { layout, makeStyles, spacing } from '@/theme';

interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default) or a fixed layout. */
  scroll?: boolean;
  /** Apply the top safe-area inset (disable when a native header is shown). */
  withTopInset?: boolean;
  padded?: boolean;
  /** Adds room for the floating tab bar (tab screens only). */
  withTabBar?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Route name of a tab screen – tapping its tab again scrolls back to the top. */
  scrollToTopKey?: string;
  /** Decorative layer rendered behind the content (fills the screen). */
  backdrop?: ReactNode;
  /**
   * A bar pinned above the scroll area – a chat's title row, say.
   *
   * It takes the top safe-area inset for itself, so the content below scrolls
   * under it instead of pushing it away.
   */
  header?: ReactNode;
  /**
   * A bar pinned below the scroll area – the duel bar in a chat, say.
   *
   * It takes the bottom safe-area inset for itself, so the content above
   * scrolls all the way to it instead of stopping short.
   */
  footer?: ReactNode;
  /**
   * Opens at the end and stays there as content arrives – for a chat, where
   * the newest message is the one you came for.
   */
  stickToBottom?: boolean;
}

/** Base screen container: dark background, safe areas, consistent padding. */
export function Screen({
  children,
  scroll = true,
  withTopInset = true,
  padded = true,
  withTabBar = false,
  refreshControl,
  contentContainerStyle,
  backdrop,
  header,
  footer,
  stickToBottom = false,
  scrollToTopKey,
}: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  /*
    Whether the list has been touched yet.

    A chat is pinned to the bottom, and the content keeps growing for a moment
    after it appears – every question preview measures itself, and each one
    moves the end again. Animating those jumps means the screen is *seen*
    scrolling down from the top. So until someone has actually scrolled it, the
    end is snapped to; afterwards a new message slides into view.
  */
  const touched = useRef(false);

  useEffect(() => {
    if (!scrollToTopKey) return;
    return registerScrollToTop(scrollToTopKey, () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  }, [scrollToTopKey]);

  // With a header the inset belongs to the bar, not to the content below it.
  const paddingTop = header ? spacing.md : withTopInset ? insets.top + spacing.sm : spacing.sm;
  // With a footer the inset belongs to the bar, not to the content above it.
  const paddingBottom = (footer ? spacing.md : insets.bottom + spacing.xl) + (withTabBar ? FLOATING_TAB_BAR_HEIGHT : 0);
  // With a backdrop the scroller itself must be see-through.
  const rootStyle = backdrop ? styles.transparent : styles.root;

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={rootStyle}
      contentContainerStyle={[{ paddingTop, paddingBottom }, padded && styles.padded, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      // Fires whenever the content grows – on the first layout, and again as
      // the messages and their previews finish measuring themselves.
      onContentSizeChange={
        stickToBottom
          ? () => scrollRef.current?.scrollToEnd({ animated: touched.current })
          : undefined
      }
      onScrollBeginDrag={
        stickToBottom
          ? () => {
              touched.current = true;
            }
          : undefined
      }
      // The safe-area padding above is applied by hand – letting iOS add its own
      // inset on top of it leaves a gap that collapses on the first scroll.
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[rootStyle, { paddingTop, paddingBottom }, padded && styles.padded]}>{children}</View>
  );

  const body =
    !footer && !header ? (
      content
    ) : (
      <View style={styles.fill}>
        {header ? (
          <View style={[styles.header, padded && styles.padded, { paddingTop: (withTopInset ? insets.top : 0) + spacing.sm }]}>
            {header}
          </View>
        ) : null}
        {content}
        {footer ? (
          <View style={[styles.footer, padded && styles.padded, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
        ) : null}
      </View>
    );

  if (!backdrop) return body;

  return (
    <View style={styles.root}>
      {backdrop}
      {body}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  root: { flex: 1, backgroundColor: colors.background },
  transparent: { flex: 1, backgroundColor: 'transparent' },
  fill: { flex: 1 },
  // A hairline above it, so the bar reads as a layer over the content rather
  // than as the last thing in the list.
  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  // A hairline below it, mirroring the footer – the bar is a layer over the
  // content, not the first thing in the list.
  header: { paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  padded: { paddingHorizontal: layout.screenPaddingHorizontal },
}));
