/**
 * ClippySupportDialog — the actual ticket.
 *
 * The tone is a joke; everything under it is a real support request that lands
 * in IT's inbox. Two rules follow from that and neither is negotiable:
 *
 *   - The SELECT VALUES are plain English severities and activities, even where
 *     the labels are gags. IT triages on the values (see `clippyCopy.js`).
 *   - The diagnostics block is shown, not hidden. It ships the user's browser,
 *     screen size, current page and click count, and a user is entitled to see
 *     that before pressing send.
 *
 * Frame comes from `scopeDialogProps` — the kit's own nested-dialog frame, which
 * is what the confirm dialogs in DisplayMeeting.js use. Everything inside is the
 * standard kit: this file invents no new controls.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, MenuItem } from "@mui/material";
import {
    scopeDialogProps,
    DialogSurface,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Spacer,
    Field,
    CcInput,
    CcTextarea,
    CcSelect,
    CcButton,
    Facts,
    Fact,
    cc,
} from "../Concourse/ConcourseDialogKit";
import ClippyFigure from "./ClippyFigure";
import { PostSupportRequest } from "../../../Utilites/Functions/ApiFunctions/SupportFunctions";
import {
    DOING_OPTIONS,
    DOING_OTHER,
    DOING_OTHER_MAX,
    FORM,
    MOOD_OPTIONS,
    tallyVerdict,
} from "./clippyCopy";
import { DEFAULT_ART, badgeFor } from "./clippyBadges";

/** Chrome/Edge/Firefox/Safari + major version, or the raw UA if it is something else. */
const readBrowser = (ua) => {
    const match =
        /(Edg|OPR|Chrome|Firefox|Safari)\/(\d+)/.exec(ua || "") || null;
    if (!match) return ua ? ua.slice(0, 80) : "Unknown";
    const names = { Edg: "Edge", OPR: "Opera" };
    return `${names[match[1]] || match[1]} ${match[2]}`;
};

const ClippySupportDialog = ({ open, clicks, user, onClose, onSent }) => {
    const [doing, setDoing] = useState(DOING_OPTIONS[0].value);
    const [doingOther, setDoingOther] = useState("");
    const [problem, setProblem] = useState("");
    const [mood, setMood] = useState(MOOD_OPTIONS[1].value);
    const [touched, setTouched] = useState(false);
    const [sending, setSending] = useState(false);

    /**
     * Snapshot the environment when the dialog opens, not on every render — the
     * ticket should describe the moment the user was stuck, and `innerWidth` in
     * particular changes if they resize the window while typing.
     */
    const diagnostics = useMemo(() => {
        if (!open || typeof window === "undefined") return null;
        return {
            page: `${window.location.pathname}${window.location.search}`,
            browser: readBrowser(window.navigator?.userAgent),
            userAgent: window.navigator?.userAgent || "",
            screen: `${window.innerWidth}×${window.innerHeight}`,
            when: new Date().toLocaleString(),
        };
    }, [open]);

    // Fresh form per episode.
    useEffect(() => {
        if (!open) return;
        setDoing(DOING_OPTIONS[0].value);
        setDoingOther("");
        setProblem("");
        setMood(MOOD_OPTIONS[1].value);
        setTouched(false);
        setSending(false);
    }, [open]);

    const isOther = doing === DOING_OTHER;

    const problemError = touched && !problem.trim() ? FORM.problemRequired : "";
    const doingOtherError =
        touched && isOther && !doingOther.trim() ? FORM.doingOtherRequired : "";

    const handleSubmit = async () => {
        setTouched(true);
        if (!problem.trim()) return;
        if (isOther && !doingOther.trim()) return;

        setSending(true);
        // No contact field: IT replies to the signed-in account. The server
        // takes that address from the JWT and never from this payload, so
        // there is nothing here to get wrong or to spoof.
        //
        // `DOING_OTHER` is a UI sentinel and must never reach the wire — what
        // goes on the ticket is the text the user typed in its place.
        const ok = await PostSupportRequest({
            doing: isOther ? doingOther.trim() : doing,
            problem: problem.trim(),
            severity: mood,
            clickCount: clicks,
            ...diagnostics,
        });
        setSending(false);
        // `PostSupportRequest` has already raised the snackbar either way — this
        // only decides whether the dialog closes, so a failed send leaves the
        // user's typing intact to retry.
        if (ok) onSent?.();
    };

    return (
        <Dialog
            open={!!open}
            onClose={sending ? undefined : onClose}
            {...scopeDialogProps(560)}
        >
            <DialogSurface accent={cc.red} data-clippy="form">
                <DialogHeader
                    badge={FORM.badge}
                    title={FORM.title}
                    sub={FORM.sub}
                    onClose={sending ? undefined : onClose}
                />

                <DialogBody>
                    {/* The rage-o-meter. Live — it keeps counting while the form
                        is open, because people carry on clicking. */}
                    <Field label={FORM.tallyLabel}>
                        <RageMeter clicks={clicks} />
                    </Field>

                    <Field label={FORM.doingLabel} htmlFor="clippy-doing">
                        <CcSelect
                            id="clippy-doing"
                            value={doing}
                            onChange={(e) => setDoing(e.target.value)}
                            ariaLabel={FORM.doingLabel}
                            fullWidth
                        >
                            {DOING_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>
                                    {o.label}
                                </MenuItem>
                            ))}
                        </CcSelect>
                    </Field>

                    {/* Only mounted while "something else" is selected, so the
                        form stays four fields long for everybody else. It is a
                        sibling of the select rather than a child of that Field
                        because DialogBody staggers its DIRECT children in — an
                        element appearing mid-list needs its own slot to animate
                        into. */}
                    {isOther ? (
                        <Field
                            label={FORM.doingOtherLabel}
                            htmlFor="clippy-doing-other"
                            required
                            hint={FORM.doingOtherCount(
                                doingOther.length,
                                DOING_OTHER_MAX
                            )}
                            error={doingOtherError}
                        >
                            <CcInput
                                id="clippy-doing-other"
                                value={doingOther}
                                invalid={!!doingOtherError}
                                placeholder={FORM.doingOtherPlaceholder}
                                onChange={(e) => setDoingOther(e.target.value)}
                                onBlur={() => setTouched(true)}
                                // `maxLength` is the UX limit. The server caps
                                // independently at 200 and strips control
                                // characters — this text reaches the mail
                                // SUBJECT line, so it is never trusted here.
                                maxLength={DOING_OTHER_MAX}
                                autoComplete="off"
                                autoFocus
                            />
                        </Field>
                    ) : null}

                    <Field
                        label={FORM.problemLabel}
                        htmlFor="clippy-problem"
                        required
                        hint={FORM.problemHint}
                        error={problemError}
                    >
                        <CcTextarea
                            id="clippy-problem"
                            value={problem}
                            invalid={!!problemError}
                            placeholder={FORM.problemPlaceholder}
                            onChange={(e) => setProblem(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={4000}
                            rows={4}
                        />
                    </Field>

                    <Field label={FORM.moodLabel} htmlFor="clippy-mood">
                        <CcSelect
                            id="clippy-mood"
                            value={mood}
                            onChange={(e) => setMood(e.target.value)}
                            ariaLabel={FORM.moodLabel}
                            fullWidth
                        >
                            {MOOD_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>
                                    {o.label}
                                </MenuItem>
                            ))}
                        </CcSelect>
                    </Field>

                    <Field label={FORM.diagnosticsLabel}>
                        <Facts>
                            <Fact label="Clicks" mono>
                                {clicks}
                            </Fact>
                            <Fact label="Page" mono>
                                {diagnostics?.page || "—"}
                            </Fact>
                            <Fact label="Browser" mono>
                                {diagnostics?.browser || "—"}
                            </Fact>
                            <Fact label="Window" mono>
                                {diagnostics?.screen || "—"}
                            </Fact>
                            <Fact label="Who">
                                {[user?.first_name, user?.last_name]
                                    .filter(Boolean)
                                    .join(" ") ||
                                    user?.email ||
                                    "—"}
                            </Fact>
                            {/* Shown, not asked. IT replies to the signed-in
                                account, and the user should be able to see
                                which address that is before sending. */}
                            <Fact label="IT replies to" mono>
                                {user?.email || "your account address"}
                            </Fact>
                        </Facts>
                    </Field>
                </DialogBody>

                <DialogFooter>
                    <CcButton onClick={onClose} disabled={sending}>
                        {FORM.cancel}
                    </CcButton>
                    <Spacer />
                    <CcButton
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={sending}
                    >
                        {sending ? FORM.submitting : FORM.submit}
                    </CcButton>
                </DialogFooter>
            </DialogSurface>
        </Dialog>
    );
};

/**
 * The rage-o-meter: the live count, a verdict on it, and the badge it is
 * currently earning. Still live while the form is open — people keep clicking
 * things while they type — so the Clippy here re-skins mid-form exactly as the
 * one in the bubble does.
 *
 * Split out only so the body above stays readable as a list of fields.
 */
const RageMeter = ({ clicks }) => {
    const badge = badgeFor(clicks);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: cc.wash,
                borderRadius: "18px",
                padding: "10px 14px",
            }}
        >
            {/* Keyed on the tier so crossing a threshold replays the pop. */}
            <ClippyFigure
                key={badge?.key || "none"}
                size={30}
                art={badge?.art || DEFAULT_ART}
            />
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        letterSpacing: "-.03em",
                        fontVariantNumeric: "tabular-nums",
                        color: cc.red,
                        lineHeight: 1.1,
                    }}
                >
                    {clicks}
                </div>
                <div style={{ fontSize: "12px", color: cc.mute }}>
                    {tallyVerdict(clicks)}
                </div>
                {/* The badge earned — never the distance to the next one. See
                    the note in ClippyBubble. */}
                {badge ? (
                    <div
                        style={{
                            fontSize: "11.5px",
                            marginTop: "3px",
                            fontWeight: 700,
                            color: cc.ink,
                        }}
                    >
                        {badge.name}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ClippySupportDialog;
