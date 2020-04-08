export const HEALTH_STATUSES = {
    0: "healthy",
    1: "incubating (non-contagious)",
    2: "asymptomatic (contagious)",
    3: "symptomatic illness",
    4: "recovered",
    5: "dead"
}

// Map health status to image
export const ADULT_IMGS = {
    0: "assets/adult-healthy.svg",
    1: "assets/adult-incubating.svg",
    2: "assets/adult-infectious.svg",
    3: "assets/adult-infectious.svg",
    4: "assets/adult-recovered.svg"
}

// Map health status to image
export const KID_IMGS = {
    0: "assets/kid-healthy.svg",
    1: "assets/kid-incubating.svg",
    2: "assets/kid-infectious.svg",
    3: "assets/kid-infectious.svg",
    4: "assets/kid-recovered.svg"
}

export const LOCATION_TYPES = {
    0: "home",
    1: "work",
    2: "school"
}

// Map location type to image
export const LOC_IMGS = {
    0: "assets/home.svg",
    1: "assets/work.svg",
    2: "assets/school.svg"
}