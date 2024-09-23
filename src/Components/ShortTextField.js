import {TextField} from "@mui/material";

const ShortTextFeild = ({onChange, value, variant, label, hoverBorderColor, borderColor, focusBorderColor, width, background, type, disabled}) => {
    
    return(
        <TextField
            size="small"
            value={value}
            variant={variant}
            label={label}
            type={type}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            sx={{
                background:background,
                width:width,
                '& .MuiOutlinedInput-root': {
                '& fieldset': {
                    borderColor: borderColor ? borderColor : 'rgba(0, 0, 0, 0.23)', // Default border color
                },
                '&:hover fieldset': {
                    borderColor: hoverBorderColor ? hoverBorderColor : !disabled ? 'rgba(0, 0, 0, 0.87)' : '', // Border color on hover
                },
                '&.Mui-focused fieldset': {
                    borderColor: focusBorderColor ? focusBorderColor :'#3f51b5', // Border color when focused
                },
                },
            }}
        />
    );
}

export default ShortTextFeild;