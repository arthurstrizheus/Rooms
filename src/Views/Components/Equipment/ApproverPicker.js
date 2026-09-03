import React from "react";
import {
    Autocomplete,
    Avatar,
    Box,
    CircularProgress,
    Grid,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

import useResponsive from "../../../hooks/useResponsive";
import { SearchAdGroups } from "../../../Utilites/Functions/ApiFunctions";
import { EmptyState } from "../UI";

// The server rejects shorter terms outright — checking here too keeps a
// pointless round trip off every first keystroke.
const MIN_GROUP_SEARCH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const fullName = (user) =>
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();

const initialsOf = (name = "") =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

/**
 * Map `equipment.Approvers` (the API's read shape) down to the write shape.
 *
 * Lives here because this component defines that shape. Fields the API only
 * ever sends — `id`, the joined `ApproverUser` — are dropped rather than
 * round-tripped, so nothing stale can ride back out in a save.
 */
export const toApproverFormValues = (approvers) => {
    if (!Array.isArray(approvers)) return [];

    return approvers
        .map((approver) => {
            if (approver?.approver_type === "ad_group") {
                if (!approver.ad_group_dn && !approver.ad_group_name) {
                    return null;
                }
                return {
                    approver_type: "ad_group",
                    ad_group_name: approver.ad_group_name,
                    ad_group_dn: approver.ad_group_dn,
                };
            }
            if (approver?.user_id == null) return null;
            return { approver_type: "user", user_id: approver.user_id };
        })
        .filter(Boolean);
};

/**
 * Pick who may approve reservations of a piece of equipment.
 *
 * An approver is either a specific person or an Active Directory group. Both
 * are added through their own Autocomplete and then land in one shared list,
 * because to the person reading the form they are the same kind of thing.
 *
 * `value` is the write shape the API accepts, not the read shape it returns:
 *
 *   [ { approver_type: "user",     user_id }
 *   | { approver_type: "ad_group", ad_group_name, ad_group_dn } ]
 *
 * Display detail is resolved rather than stored — people from the already
 * loaded `users` list, group descriptions from whatever the search returned
 * this session — so nothing extra rides along in the save payload.
 */
const ApproverPicker = ({ value = [], onChange, users = [] }) => {
    const { isMobile } = useResponsive();

    const [personInput, setPersonInput] = React.useState("");
    const [groupInput, setGroupInput] = React.useState("");
    const [groupResults, setGroupResults] = React.useState([]);
    const [groupLoading, setGroupLoading] = React.useState(false);
    // Assumed true until the server says otherwise, so a slow first search
    // doesn't flash "not configured" at someone whose directory is fine.
    const [directoryConfigured, setDirectoryConfigured] = React.useState(true);

    // Descriptions only exist on search results, and the write shape has
    // nowhere to keep them. Remembering them by DN lets a group the admin just
    // picked show its description instead of a raw LDAP path.
    const [groupDescriptions, setGroupDescriptions] = React.useState({});

    const term = groupInput.trim();

    React.useEffect(() => {
        if (term.length < MIN_GROUP_SEARCH) {
            setGroupResults([]);
            setGroupLoading(false);
            return undefined;
        }

        // Two guards, because typing outruns the network: the abort frees the
        // superseded request, and `active` makes sure a response that resolved
        // before the abort landed can still never reach state out of order.
        const controller = new AbortController();
        let active = true;

        setGroupLoading(true);
        const timer = setTimeout(async () => {
            const { configured, groups } = await SearchAdGroups(term, {
                signal: controller.signal,
            });
            if (!active) return;
            setGroupResults(groups);
            setDirectoryConfigured(configured);
            setGroupLoading(false);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    const selectedUserIds = new Set(
        value
            .filter((a) => a.approver_type === "user")
            .map((a) => a.user_id),
    );
    const selectedGroupDns = new Set(
        value
            .filter((a) => a.approver_type === "ad_group")
            .map((a) => a.ad_group_dn),
    );

    // Already-chosen entries leave the option lists entirely, so a duplicate
    // is impossible to attempt rather than rejected after the fact.
    const personOptions = users.filter((u) => !selectedUserIds.has(u.id));
    const groupOptions = groupResults.filter(
        (g) => !selectedGroupDns.has(g.dn),
    );

    const addPerson = (person) => {
        if (!person || selectedUserIds.has(person.id)) return;
        onChange([
            ...value,
            { approver_type: "user", user_id: person.id },
        ]);
    };

    const addGroup = (group) => {
        if (!group || selectedGroupDns.has(group.dn)) return;
        if (group.description) {
            setGroupDescriptions((prev) => ({
                ...prev,
                [group.dn]: group.description,
            }));
        }
        onChange([
            ...value,
            {
                approver_type: "ad_group",
                ad_group_name: group.name,
                ad_group_dn: group.dn,
            },
        ]);
    };

    const removeAt = (index) =>
        onChange(value.filter((_, i) => i !== index));

    const rows = value.map((approver, index) => {
        if (approver.approver_type === "ad_group") {
            return {
                key: `group-${approver.ad_group_dn || approver.ad_group_name || index}`,
                isGroup: true,
                primary: approver.ad_group_name || "Unnamed group",
                secondary:
                    groupDescriptions[approver.ad_group_dn] ||
                    approver.ad_group_dn ||
                    "Active Directory group",
            };
        }

        const person = users.find((u) => u.id === approver.user_id);
        return {
            key: `user-${approver.user_id ?? index}`,
            isGroup: false,
            primary: person
                ? fullName(person)
                : `User #${approver.user_id ?? "?"}`,
            secondary:
                person?.email ||
                person?.username ||
                "This account is no longer in the directory",
        };
    });

    const groupHelperText = () => {
        // Checked before "no matches", because otherwise an admin on a server
        // with no LDAP configured is told their search matched nothing and
        // keeps trying different spellings of a name that was never reachable.
        if (!directoryConfigured) {
            return "Active Directory is not configured on this server — pick people instead";
        }
        if (term.length < MIN_GROUP_SEARCH) {
            return `Type at least ${MIN_GROUP_SEARCH} characters to search`;
        }
        if (groupLoading) return "Searching Active Directory…";
        if (groupOptions.length === 0) return `No groups match “${term}”`;
        return "Search by group name";
    };

    const groupNoOptionsText =
        term.length < MIN_GROUP_SEARCH
            ? `Type at least ${MIN_GROUP_SEARCH} characters to search Active Directory`
            : groupResults.length > 0
              ? "Every matching group is already an approver"
              : `No groups match “${term}”`;

    return (
        <Stack spacing={2}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Autocomplete
                        options={personOptions}
                        // Acts as an adder, not a selection: the picked person
                        // moves straight into the list below, so the field
                        // itself always returns to empty.
                        value={null}
                        inputValue={personInput}
                        onInputChange={(_, next, reason) =>
                            setPersonInput(reason === "reset" ? "" : next)
                        }
                        onChange={(_, picked) => addPerson(picked)}
                        blurOnSelect
                        getOptionLabel={(option) =>
                            fullName(option) || option?.username || ""
                        }
                        filterOptions={(options, { inputValue }) => {
                            const needle = inputValue.trim().toLowerCase();
                            if (!needle) return options;
                            return options.filter(
                                (option) =>
                                    fullName(option)
                                        .toLowerCase()
                                        .includes(needle) ||
                                    option.email
                                        ?.toLowerCase()
                                        .includes(needle) ||
                                    option.username
                                        ?.toLowerCase()
                                        .includes(needle),
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Add a person"
                                placeholder="Search people"
                                helperText="Search by name, username or email"
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.id}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            fontSize: "0.6875rem",
                                        }}
                                    >
                                        {initialsOf(fullName(option))}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" noWrap>
                                            {fullName(option)}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >
                                            {option.email || option.username}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        )}
                        noOptionsText={
                            users.length > 0 && personOptions.length === 0
                                ? "Everyone is already an approver"
                                : "No people match"
                        }
                        ListboxProps={{ style: { maxHeight: 250 } }}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Autocomplete
                        options={groupOptions}
                        value={null}
                        inputValue={groupInput}
                        onInputChange={(_, next, reason) =>
                            setGroupInput(reason === "reset" ? "" : next)
                        }
                        onChange={(_, picked) => addGroup(picked)}
                        loading={groupLoading}
                        blurOnSelect
                        // The server has already filtered; filtering again
                        // locally would hide results whose match is in a field
                        // the label doesn't show.
                        filterOptions={(options) => options}
                        getOptionLabel={(option) => option?.name || ""}
                        isOptionEqualToValue={(option, selected) =>
                            option.dn === selected?.dn
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Add an AD group"
                                placeholder="Search groups"
                                helperText={groupHelperText()}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {groupLoading && (
                                                <CircularProgress
                                                    color="inherit"
                                                    size={18}
                                                />
                                            )}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.dn}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            bgcolor: "info.light",
                                            color: "info.dark",
                                        }}
                                    >
                                        <GroupsOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    </Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" noWrap>
                                            {option.name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >
                                            {option.description || option.dn}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        )}
                        loadingText="Searching Active Directory…"
                        noOptionsText={groupNoOptionsText}
                        ListboxProps={{ style: { maxHeight: 250 } }}
                        fullWidth
                    />
                </Grid>
            </Grid>

            {rows.length === 0 ? (
                <EmptyState
                    // Compact drops the illustration ring — a form section is
                    // not the place for a page-scale empty state.
                    variant="compact"
                    title="No approvers named"
                    description="Administrators approve reservations of this equipment by default. Add a person or an AD group to route approvals to them instead."
                    sx={{
                        borderRadius: 2.5,
                        border: "1px dashed",
                        borderColor: "divider",
                        bgcolor: "grey.50",
                        px: 2,
                    }}
                />
            ) : (
                <Stack spacing={1}>
                    {rows.map((row, index) => (
                        <Stack
                            key={row.key}
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                                px: 1.25,
                                py: 1,
                                borderRadius: 2.5,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "grey.50",
                                animation:
                                    "seaRiseIn 260ms cubic-bezier(0.22,1,0.36,1) both",
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 34,
                                    height: 34,
                                    flexShrink: 0,
                                    bgcolor: row.isGroup
                                        ? "info.light"
                                        : "primary.50",
                                    color: row.isGroup
                                        ? "info.dark"
                                        : "primary.main",
                                }}
                            >
                                {row.isGroup ? (
                                    <GroupsOutlinedIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <PersonOutlineIcon sx={{ fontSize: 18 }} />
                                )}
                            </Avatar>

                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                    noWrap
                                >
                                    {row.primary}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                    noWrap
                                >
                                    {row.secondary}
                                </Typography>
                            </Box>

                            {/* Empty title on touch: there is nothing to hover
                                with, so the tooltip only ever arrives as a
                                long-press the user didn't ask for. */}
                            <Tooltip title={isMobile ? "" : "Remove approver"}>
                                <IconButton
                                    size="small"
                                                onClick={() => removeAt(index)}
                                    aria-label={`Remove ${row.primary}`}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        flexShrink: 0,
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
};

export default ApproverPicker;
