import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import { useAuth } from "../../../../Utilites/AuthContext";
import { GetRoomResources } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import ImageViewer from "../../../../Components/ImageViewer";
import { GetRoomImage } from "../../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import DisplayGroups from "../../../Components/DisplayGroups";
import { ColorSwatch } from "./RoomsAtoms";
import {
    cc,
    CcButton,
    Fact,
    Facts,
    Block,
} from "../../../Components/Concourse/ConcourseDialogKit";
import { type as ccType } from "../../../../Utilites/concourse";

/** Guide §3.4 section header: `blockLabel` in `mute`, then the hairline. */
const GroupHeader = ({ label, action }) => (
    <Box>
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                minHeight: "30px",
            }}
        >
            <Box sx={{ ...ccType.blockLabel, color: cc.mute }}>{label}</Box>
            {action}
        </Box>
        <Box sx={{ height: "1px", background: cc.line, margin: "9px 0 0" }} />
    </Box>
);

const groupSx = {
    display: "grid",
    gap: "12px",
    alignContent: "start",
    minWidth: 0,
    boxSizing: "border-box",
};

const RowRoom = ({ location, row, rowRoom, groups, roomgroups, setOpen }) => {
    const [roomGroups, setRoomGroups] = useState([]);
    const [roomResources, setRoomResources] = useState([]);
    const [roomImage, setRoomImage] = useState(null); // State to hold the room image URL

    useEffect(() => {
        async function fetchRoomImage() {
            if (row?.image_url) {
                try {
                    const image = await GetRoomImage(row.image_url);
                    setRoomImage(image);
                } catch (error) {
                    console.error("Error fetching room image:", error);
                }
            } else {
                console.warn("No image URL provided for the room.");
            }
        }
        fetchRoomImage();
    }, [row]);

    const { user } = useAuth();

    useEffect(() => {
        const rgroups = roomgroups.filter((rg) => rg.room_id == row.id);
        let allRoomGroups = [];
        rgroups?.map((rg) => {
            allRoomGroups.push(groups?.find((grp) => grp.id == rg.group_id));
        });
        setRoomGroups(allRoomGroups);
    }, [roomgroups]);

    useEffect(() => {
        const data = async () => {
            const rmrs = await GetRoomResources(rowRoom.id);
            setRoomResources(rmrs);
        };
        if (rowRoom?.id) {
            data();
        }
    }, [rowRoom, row]);

    return (
        <Box
            sx={{
                display: "grid",
                gap: "12px",
                boxSizing: "border-box",
                gridTemplateColumns: "1fr",
                // The two panels used to carry `min-width: 550px` each, which
                // forced a hard 1100px floor and never collapsed.
                "@media (min-width:980px)": {
                    gridTemplateColumns: "1fr 1fr",
                },
            }}
        >
            <Box sx={groupSx}>
                <GroupHeader
                    label="Room"
                    action={
                        (user?.admin ||
                            user?.office_admin == `${location?.officeid}`) && (
                            <CcButton
                                onClick={() => setOpen(rowRoom, location)}
                                sx={{
                                    padding: "6px 13px",
                                    fontSize: "12.5px",
                                }}
                            >
                                <EditIcon sx={{ fontSize: "18px" }} />
                                Edit
                            </CcButton>
                        )
                    }
                />
                <Facts>
                    <Fact label="Name">{row.room}</Fact>
                    <Fact label="Location">{location?.Alias}</Fact>
                    <Fact label="Capacity" mono>
                        {row.capacity}
                    </Fact>
                    <Fact label="Color">
                        <ColorSwatch color={row.color} width={34} height={20} />
                    </Fact>
                    <Fact label="Access Groups">
                        {roomGroups.length == 0 ? (
                            "None"
                        ) : (
                            <DisplayGroups groups={roomGroups} />
                        )}
                    </Fact>
                    <Fact label="Room Resources">
                        {roomResources
                            ?.map((resource) => resource.name)
                            .join(", ")}
                    </Fact>
                </Facts>
                {row?.image_url && (
                    <Block label="Image">
                        <ImageViewer
                            src={roomImage}
                            alt={`${row?.value} room image`}
                            style={{
                                maxWidth: "300px",
                                maxHeight: "260px",
                                objectFit: "cover",
                                borderRadius: "14px",
                                border: "1px solid var(--cc-line)",
                                boxSizing: "border-box",
                            }}
                        />
                    </Block>
                )}
            </Box>

            <Box sx={groupSx}>
                <GroupHeader label="Location" />
                <Facts>
                    <Fact label="Alias">{location?.Alias}</Fact>
                    <Fact label="Number" mono>
                        {location?.Number}
                    </Fact>
                    <Fact label="City">{location?.City}</Fact>
                    <Fact label="State">{location?.state}</Fact>
                    <Fact label="Zip" mono>
                        {location?.Zip}
                    </Fact>
                    <Fact label="Address">{location?.SAddress}</Fact>
                    <Fact label="Airport">{location?.Airport}</Fact>
                </Facts>
            </Box>
        </Box>
    );
};

export default RowRoom;
