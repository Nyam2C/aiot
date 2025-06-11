module.exports = [
  {
    show: "PSY",
    locations: [
      {
        location: "Seoul",
        dates: [
          {
            date: "20250610",
            sessions: [
              { session: 1, seats: [
                { name: "G10", available: true },
                { name: "G11", available: true },
                { name: "G12", available: true }
              ] },
              { session: 2, seats: [
                { name: "A01", available: true },
                { name: "A02", available: true }
              ] },
            ],
          },
          {
            date: "20250611",
            sessions: [
              { session: 1, seats: [
                { name: "B05", available: true },
                { name: "B06", available: true }
              ] },
            ],
          },
        ],
      },
      {
        location: "Busan",
        dates: [
          {
            date: "20250612",
            sessions: [
              { session: 1, seats: [
                { name: "C10", available: true },
                { name: "C11", available: true }
              ] },
              { session: 2, seats: [
                { name: "D01", available: true }
              ] },
            ],
          },
        ],
      },
    ],
  },
  {
    show: "BTS",
    locations: [
      {
        location: "Seoul",
        dates: [
          {
            date: "20250612",
            sessions: [
              { session: 1, seats: [
                { name: "E20", available: true },
                { name: "E21", available: true }
              ] },
            ],
          },
          {
            date: "20250613",
            sessions: [
              { session: 2, seats: [
                { name: "F05", available: true }
              ] },
            ],
          },
        ],
      },
    ],
  },
  {
    show: "IU",
    locations: [
      {
        location: "Incheon",
        dates: [
          {
            date: "20250614",
            sessions: [
              { session: 1, seats: [
                { name: "G07", available: true },
                { name: "G08", available: true }
              ] },
            ],
          },
        ],
      },
    ],
  },
];