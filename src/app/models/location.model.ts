export class Location {

    id: number;
    type: number; // home = 0, work = 1, school = 2
    capacity: number;
    // Number of people that one person at this location will have close contact with in one hour
    contactsPerHour: number;
    coordinates: [number, number];
    // List of IDs of people who are members of this location (for home/work/school)
    members: number[];
    open: boolean;

    constructor(
        id: number,
        type: number,
        capacity: number,
        coordinates: [number, number],
        members: number[] = [],
        open: boolean = true
    ) {
        this.id = id;
        this.type = type;
        this.capacity = capacity;
        this.coordinates = coordinates;
        this.members = members;
        this.open = open;
    }

}
