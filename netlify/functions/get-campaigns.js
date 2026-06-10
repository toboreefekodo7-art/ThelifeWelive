exports.handler = async () => {
  const campaigns = [
    {
      id: "first-campaign",
      title: "First TLWL Campaign Coming Soon",
      status: "Launching Soon",
      story: "This campaign area can be used to raise support for a student, family, scholarship, emergency need, or community initiative.",
      goal: 1000,
      raised: 0,
      donors: 0,
      uses: [
        "Direct support to the approved recipient",
        "Scholarship or educational expenses",
        "Community impact initiatives",
        "Verified emergency assistance"
      ]
    }
  ];

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaigns })
  };
};
